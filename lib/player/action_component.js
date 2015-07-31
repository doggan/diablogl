'use strict';

let assert = require('assert'),
    PF = require('pathfinding'),
    util = require('./../util'),
    LevelController = require('./../level_controller'),
    Signals = require('./../signals'),
    THREE = require('three'),
    App = require('../app');

let Vector2 = THREE.Vector2;

let State = {
    IDLE: 0,
    MOVE: 1,
    ATTACK: 2,
};

class ActionComponent {
    constructor() {
        this.MOVE_SPEED = new Vector2(150, 100);

        this.currentState = State.IDLE;

        this.currentFacingDirection = 0;
        this.currentMoveDirection = new Vector2();
        this.currentMoveSpeed = 0;
        this.currentPath = null;
        this.currentPathIndex = -1;

        this.currentDistanceRemainingToTargetPosition = 0;
        this.pathfinder = new PF.AStarFinder({
            allowDiagonal: true,
            dontCrossCorners: true
        });

        this.breadCrumbSpawnTimer = 0;
        this.TEMP_enemyKillCount = 0;
    }

    start() {
        this.animComponent = this.entity.getComponent('AnimComponent');
        this.networkComponent = this.entity.getComponent('NetworkComponent');
        this.gameObjectComponent = this.entity.getComponent('PlayerComponent');

        this.currentTargetPosition = this.gameObjectComponent.position.clone();

        this._registerAnimEvents();

        this.entity.addSignalListener('damage', this._onDamaged.bind(this));
    }

    _registerAnimEvents() {
        // TODO: cleaner way to do this for all 8 directions?

        let i;
        let self = this;

        function doAttack() {
            let attackGridPosition = util.getGridOffsetInDirection(self.currentFacingDirection);
            attackGridPosition.add(self.gameObjectComponent.currentGridPosition);

            // let dbgAttackWorldPos = new THREE.Vector2();
            // util.gridToWorldCoord(attackGridPosition, dbgAttackWorldPos);
            // DbgDraw.drawSphere(new THREE.Vector3(dbgAttackWorldPos.x, dbgAttackWorldPos.y, 1000), 10, 'yellow');

            let enemy = LevelController.getEnemy(attackGridPosition);
            if (enemy) {
                let info = {
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
    }

    _onDamaged( /*info*/ ) {
        // console.log('Player takes damage: ' + info.amount);
    }

    TEMP_onEnemyKilled() {
        this.TEMP_enemyKillCount++;
        console.log('enemy killed: ' + this.TEMP_enemyKillCount);
    }

    update() {
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
    }

    _followPath() {
        let moveAmount = this.currentMoveSpeed * App.deltaTime;
        this.currentDistanceRemainingToTargetPosition -= moveAmount;

        // Arrived at target position?
        if (this.currentDistanceRemainingToTargetPosition <= 0.0) {
            this.gameObjectComponent.position.copy(this.currentTargetPosition);

            // End of path?
            if (this._isEndOfPath()) {
                this.currentPath = null;
                this.currentState = State.IDLE;
            } else {
                // To next node.
                this.currentPathIndex++;

                let nextPathNode = this.currentPath[this.currentPathIndex];
                this._setTargetGridPosition(nextPathNode[0], nextPathNode[1]);
            }
        } else {
            this.gameObjectComponent.position.set(
                this.gameObjectComponent.position.x + this.currentMoveDirection.x * moveAmount,
                this.gameObjectComponent.position.y + this.currentMoveDirection.y * moveAmount);

            // DbgDraw.drawLine(
            //     new this.game.THREE.Vector3(this.gameObjectComponentposition.x, this.gameObjectComponent.position.y, 6000),
            //     new this.game.THREE.Vector3(this.currentTargetPosition.x, this.currentTargetPosition.y, 6000),
            //     'red'
            // );
        }
    }

    _isEndOfPath() {
        // End of the path?
        if ((this.currentPathIndex + 1) >= this.currentPath.length) {
            return true;
        }

        // Next path node is blocked?
        let nextNode = this.currentPath[this.currentPathIndex + 1];
        let nextGridPos = new THREE.Vector2(nextNode[0], nextNode[1]);
        if (LevelController.checkDynamicCollision(nextGridPos)) {
            return true;
        }

        return false;
    }

    _setTargetGridPosition(x, y) {
        // Facing direction.
        this._setFacingDirection(x, y);

        // Move speed.
        this.currentMoveSpeed = util.getMoveSpeed(this.currentFacingDirection, this.MOVE_SPEED.x, this.MOVE_SPEED.y);

        // Update current grid position.
        this.gameObjectComponent.setGridPosition(new Vector2(x, y));

        // Target position.
        util.gridToWorldCoord(this.gameObjectComponent.currentGridPosition, this.currentTargetPosition);
        this.currentDistanceRemainingToTargetPosition = this.gameObjectComponent.position.distanceTo(this.currentTargetPosition);

        // Move direction.
        this.currentMoveDirection.setX(this.currentTargetPosition.x - this.gameObjectComponent.position.x);
        this.currentMoveDirection.setY(this.currentTargetPosition.y - this.gameObjectComponent.position.y);
        this.currentMoveDirection.normalize();
    }

    _setFacingDirection(x, y) {
        let facingDirection = util.getDirection(this.gameObjectComponent.currentGridPosition.x, this.gameObjectComponent.currentGridPosition.y, x, y);
        if (facingDirection !== -1) {
            this.currentFacingDirection = facingDirection;
        }
    }

    isMoving() {
        return this.currentState === State.MOVE;
    }

    requestMove(targetGridPosition, ignoreTargetGridPositionCollision) {
        assert(this.currentState === State.IDLE ||
            this.currentState === State.MOVE);

        // No need to re-calculate path since we're already moving to same location.
        if (this.isMoving()) {
            let lastPathNode = this.currentPath[this.currentPath.length - 1];
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

        let grid = LevelController.getCollisionGrid();

        if (ignoreTargetGridPositionCollision) {
            grid.setWalkableAt(targetGridPosition.x, targetGridPosition.y, true);
        }

        let path = this.pathfinder.findPath(
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

        let nextPathNode = path[this.currentPathIndex];
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
                startX: this.gameObjectComponent.position.x,
                startY: this.gameObjectComponent.position.y
            }
        });
        */

        return true;
    }

    stopMoving() {
        if (this.isMoving()) {
            // Trim the path so only the current target node remains.
            let startIndex = this.currentPathIndex;
            let endIndex = startIndex + 1;
            if (endIndex < this.currentPath.length) {
                this.currentPath = this.currentPath.slice(startIndex, endIndex);
            }
        }
    }

    isAttacking() {
        return this.currentState === State.ATTACK;
    }

    attackInDirection(gridPos) {
        assert(this.currentState === State.IDLE);

        this._setFacingDirection(gridPos.x, gridPos.y);
        this.animComponent.play('wlsat_' + this.currentFacingDirection);
        this.currentState = State.ATTACK;
    }

    faceDirection(gridPos) {
        assert(this.currentState === State.IDLE);

        this._setFacingDirection(gridPos.x, gridPos.y);
    }
}

module.exports = function(options) {
    return new ActionComponent(options);
};
