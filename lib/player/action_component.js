'use strict';

var assert = require('assert'),
    inherits = require('inherits'),
    Component = require('./../core/component'),
    PF = require('pathfinding'),
    util = require('./../util'),
    LevelController = require('./../level_controller'),
    Signals = require('./../signals');

var Vector2 = THREE.Vector2;

var State = {
    IDLE: 0,
    MOVE: 1,
    ATTACK: 2,
};

function ActionComponent (entity) {
    Component.call(this, entity);

    this.game = entity.game;

    this.MOVE_SPEED = new Vector2(150, 100);

    this.currentState = State.IDLE;

    this.currentFacingDirection = 0;
    this.currentMoveDirection = new Vector2();
    this.currentMoveSpeed = 0;
    this.currentPath = null;
    this.currentPathIndex = -1;
    this.currentTargetPosition = this.entity.position.clone();
    this.currentDistanceRemainingToTargetPosition = 0;
    this.pathfinder = new PF.AStarFinder({
        allowDiagonal: true,
        dontCrossCorners: true
    });

    this.breadCrumbSpawnTimer = 0;
    this.TEMP_enemyKillCount = 0;
}

inherits(ActionComponent, Component);

ActionComponent.prototype.start = function() {
    this.animComponent = this.entity.getComponent('AnimComponent');
    this.networkComponent = this.entity.getComponent('NetworkComponent');
    this.gameObjectComponent = this.entity.getComponent('GameObjectComponent');

    this._registerAnimEvents();

    this.entity.addSignalListener('damage', this._onDamaged.bind(this));
};

ActionComponent.prototype._registerAnimEvents = function () {
    // TODO: cleaner way to do this for all 8 directions?

    var i;
    var self = this;

    function doAttack() {
        var attackGridPosition = util.getGridOffsetInDirection(self.currentFacingDirection);
        attackGridPosition.add(self.gameObjectComponent.currentGridPosition);

        // var dbgAttackWorldPos = new THREE.Vector2();
        // util.gridToWorldCoord(attackGridPosition, dbgAttackWorldPos);
        // DbgDraw.drawSphere(new THREE.Vector3(dbgAttackWorldPos.x, dbgAttackWorldPos.y, 1000), 10, 'yellow');

        var enemy = LevelController.getEnemy(attackGridPosition);
        if (enemy) {
            var info = {
                amount: 1,
                fromEntity: self.entity,
            };
            Signals.sendDamage(enemy, info);
        }
    }

    function doAttackEnd() {
        self.currentState = State.IDLE;
    }

    for (i = 0; i < 8; i++) {
        this.animComponent.registerCallback('wlsat_' + i, 9, doAttack);
    }
    for (i = 0; i < 8; i++) {
        this.animComponent.registerCallback('wlsat_' + i, doAttackEnd);
    }
};

ActionComponent.prototype._onDamaged = function (/*info*/) {
    // console.log('Player takes damage: ' + info.amount);
};

ActionComponent.prototype.TEMP_onEnemyKilled = function() {
    this.TEMP_enemyKillCount++;
    console.log('enemy killed: ' + this.TEMP_enemyKillCount);
};

var BREADCRUMB_SPAWN_INTERVAL = 0.5;

ActionComponent.prototype.update = function() {
    switch (this.currentState) {
        case State.MOVE:
            this._followPath();
            break;
    }

    // Animation update.
    switch (this.currentState) {
        case State.IDLE:
            this.animComponent.play('wlsas_' + this.currentFacingDirection);
            break;
        case State.MOVE:
            this.animComponent.play('wlsaw_' + this.currentFacingDirection);
            break;
    }

    if (this.breadCrumbSpawnTimer > BREADCRUMB_SPAWN_INTERVAL) {
        var breadCrumb = {
            id: 0,
            gridPosition: this.gameObjectComponent.currentGridPosition.clone()
        };

        LevelController.addBreadcrumb(breadCrumb);

        this.breadCrumbSpawnTimer = 0;
    }
    else {
        this.breadCrumbSpawnTimer += this.game.time.deltaTime;
    }
};

ActionComponent.prototype._followPath = function () {
    var moveAmount = this.currentMoveSpeed * this.game.time.deltaTime;
    this.currentDistanceRemainingToTargetPosition -= moveAmount;

    // Arrived at target position?
    if (this.currentDistanceRemainingToTargetPosition <= 0.0) {
        this.entity.position.copy(this.currentTargetPosition);

        // End of path?
        if (this._isEndOfPath()) {
            this.currentPath = null;
            this.currentState = State.IDLE;
        } else {
            // To next node.
            this.currentPathIndex++;

            var nextPathNode = this.currentPath[this.currentPathIndex];
            this._setTargetGridPosition(nextPathNode[0], nextPathNode[1]);
        }
    } else {
        this.entity.position.set(
            this.entity.position.x + this.currentMoveDirection.x * moveAmount,
            this.entity.position.y + this.currentMoveDirection.y * moveAmount);

        // DbgDraw.drawLine(
        //     new this.game.THREE.Vector3(this.entity.position.x, this.entity.position.y, 6000),
        //     new this.game.THREE.Vector3(this.currentTargetPosition.x, this.currentTargetPosition.y, 6000),
        //     'red'
        // );
    }
};

ActionComponent.prototype._isEndOfPath = function () {
    // End of the path?
    if ((this.currentPathIndex + 1) >= this.currentPath.length) {
        return true;
    }

    // Next path node is blocked?
    var nextNode = this.currentPath[this.currentPathIndex + 1];
    var nextGridPos = new THREE.Vector2(nextNode[0], nextNode[1]);
    if (LevelController.checkDynamicCollision(nextGridPos)) {
        return true;
    }

    return false;
};

ActionComponent.prototype._setTargetGridPosition = function (x, y) {
    // Facing direction.
    this._setFacingDirection(x, y);

    // Move speed.
    this.currentMoveSpeed = util.getMoveSpeed(this.currentFacingDirection, this.MOVE_SPEED.x, this.MOVE_SPEED.y);

    // Update current grid position.
    this.gameObjectComponent.setGridPosition(new Vector2(x, y));

    // Target position.
    util.gridToWorldCoord(this.gameObjectComponent.currentGridPosition, this.currentTargetPosition);
    this.currentDistanceRemainingToTargetPosition = this.entity.position.distanceTo(this.currentTargetPosition);

    // Move direction.
    this.currentMoveDirection.setX(this.currentTargetPosition.x - this.entity.position.x);
    this.currentMoveDirection.setY(this.currentTargetPosition.y - this.entity.position.y);
    this.currentMoveDirection.normalize();
};

ActionComponent.prototype._setFacingDirection = function (x, y) {
    var facingDirection = util.getDirection(this.gameObjectComponent.currentGridPosition.x, this.gameObjectComponent.currentGridPosition.y, x, y);
    if (facingDirection !== -1) {
        this.currentFacingDirection = facingDirection;
    }
};

ActionComponent.prototype.isMoving = function () {
    return this.currentState === State.MOVE;
};

ActionComponent.prototype.requestMove = function (targetGridPosition, ignoreTargetGridPositionCollision) {
    assert(this.currentState === State.IDLE ||
           this.currentState === State.MOVE);

    // No need to re-calculate path since we're already moving to same location.
    if (this.isMoving()) {
        var lastPathNode = this.currentPath[this.currentPath.length - 1];
        if ((lastPathNode[0] === targetGridPosition.x) &&
            (lastPathNode[1] === targetGridPosition.y)) {
            return true;
        }
    }

    // If target is already 1 cell away, no need to actually move.
    if (ignoreTargetGridPositionCollision &&
        util.getGridDistance(this.gameObjectComponent.currentGridPosition, targetGridPosition) === 1) {
        // Only short-circuit if we're already stopped, else we could be moving to a different location.
        if (!this.isMoving()) {
            return true;
        }
    }

    var grid = LevelController.getCollisionGrid();

    if (ignoreTargetGridPositionCollision) {
        grid.setWalkableAt(targetGridPosition.x, targetGridPosition.y, true);
    }

    var path = this.pathfinder.findPath(
        this.gameObjectComponent.currentGridPosition.x, this.gameObjectComponent.currentGridPosition.y,
        targetGridPosition.x, targetGridPosition.y,
        grid);

    // No path.
    if (path.length < 2) {
        return false;
    }

    this.currentState = State.MOVE;
    this.currentPath = path;
    this.currentPathIndex = 0;

    var nextPathNode = path[this.currentPathIndex];
    this._setTargetGridPosition(nextPathNode[0], nextPathNode[1]);

    /*
    // TODO: alert remote player to follow this path
    this.networkComponent.networkMgr.broadcastToOthers_object({
        rpc: 'RPC_followPath',
        objectId: this.networkComponent.objectId,
        data: {
            path: path,
            targetPosX: this.currentTargetPosX,
            targetPosY: this.currentTargetPosY,
            startX: this.entity.position.x,
            startY: this.entity.position.y
        }
    });
    */

    return true;
};

ActionComponent.prototype.stopMoving = function () {
    if (this.isMoving()) {
        // Trim the path so only the current target node remains.
        var startIndex = this.currentPathIndex;
        var endIndex = startIndex + 1;
        if (endIndex < this.currentPath.length) {
            this.currentPath = this.currentPath.slice(startIndex, endIndex);
        }
    }
};

ActionComponent.prototype.isAttacking = function () {
    return this.currentState === State.ATTACK;
};

ActionComponent.prototype.attackInDirection = function (gridPos) {
    assert(this.currentState === State.IDLE);

    this._setFacingDirection(gridPos.x, gridPos.y);
    this.animComponent.play('wlsat_' + this.currentFacingDirection);
    this.currentState = State.ATTACK;
};

ActionComponent.prototype.faceDirection = function (gridPos) {
    assert(this.currentState === State.IDLE);

    this._setFacingDirection(gridPos.x, gridPos.y);
};

module.exports = ActionComponent;
