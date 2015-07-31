'use strict';

let assert = require('assert'),
    inherits = require('inherits'),
    Component = require('./../core/component'),
    util = require('./../util'),
    LevelController = require('./../level_controller'),
    Signals = require('./../signals');

let THREE = require('three');
let Vector2 = THREE.Vector2;

let State = {
    IDLE: 0,
    MOVE: 1,
    ATTACK: 2,
    DAMAGE: 3,
    DEAD: 4,
};

function ActionComponent(entity) {
    Component.call(this, entity);

    this.game = entity.game;

    this.MOVE_SPEED = new Vector2(80, 40);

    this.currentState = State.IDLE;

    this.currentDestinationGridPosition = new Vector2();
    this.currentFacingDirection = 0;
    this.currentMoveDirection = new Vector2();
    this.currentMoveSpeed = 0;
    this.currentTargetPosition = this.entity.position.clone();
    this.currentDistanceRemainingToTargetPosition = 0;
}

inherits(ActionComponent, Component);

ActionComponent.prototype.start = function() {
    this.animComponent = this.entity.getComponent('AnimComponent');
    this.gameObjectComponent = this.entity.getComponent('GameObjectComponent');

    this._registerAnimEvents();
};

ActionComponent.prototype._registerAnimEvents = function() {
    // TODO: cleaner way to do this for all 8 directions?

    let i;
    let self = this;

    function doAttack() {
        let attackGridPosition = util.getGridOffsetInDirection(self.currentFacingDirection);
        attackGridPosition.add(self.gameObjectComponent.currentGridPosition);

        // let dbgAttackWorldPos = new THREE.Vector2();
        // util.gridToWorldCoord(attackGridPosition, dbgAttackWorldPos);
        // DbgDraw.drawSphere(new THREE.Vector3(dbgAttackWorldPos.x, dbgAttackWorldPos.y, 1000), 10, 'yellow');

        let player = LevelController.getPlayerAtGridPosition(attackGridPosition);
        if (player) {
            let info = {
                amount: 1,
                fromEntity: self.entity,
            };
            Signals.sendDamage(player, info);
        }
    }

    function doAttackEnd() {
        self.currentState = State.IDLE;
    }

    for (i = 0; i < 8; i++) {
        this.animComponent.registerCallback('phalla_' + i, 9, doAttack);
    }
    for (i = 0; i < 8; i++) {
        this.animComponent.registerCallback('phalla_' + i, doAttackEnd);
    }

    function doTakeDamageEnd() {
        self.currentState = State.IDLE;
    }

    for (i = 0; i < 8; i++) {
        this.animComponent.registerCallback('phallh_' + i, doTakeDamageEnd);
    }
};

ActionComponent.prototype.update = function(dt) {
    switch (this.currentState) {
        case State.MOVE:
            this._followPath(dt);
            break;
    }

    // Animation update.
    switch (this.currentState) {
        case State.IDLE:
            this.animComponent.play('phalln_' + this.currentFacingDirection);
            break;
        case State.MOVE:
            this.animComponent.play('phallw_' + this.currentFacingDirection);
            break;
    }

    // TODO: temp - move to AI
    // if (this.game.isMouseButtonDown()) {
    //     let mousePos = this.game.mousePosition;
    //     let gridPos = new Vector2();
    //     util.screenToWorldCoord(this.game.width, this.game.height, mousePos, this.game.camera, gridPos);
    //     util.worldToGridCoord(gridPos, gridPos);
    //
    //     this.requestMove(gridPos);
    // }
    // if (this.game.isKeyDown(49)) {
    //     let breadCrumb = LevelController.getNewestBreadcrumb(0);
    //     if (breadCrumb) {
    //         this.requestMove(breadCrumb.gridPosition);
    //     }
    // }
};

ActionComponent.prototype._followPath = function() {
    let moveAmount = this.currentMoveSpeed * this.game.time.deltaTime;
    this.currentDistanceRemainingToTargetPosition -= moveAmount;

    // Arrived at target position?
    if (this.currentDistanceRemainingToTargetPosition <= 0.0) {
        this.entity.position.copy(this.currentTargetPosition);

        // End of path?
        if (this.gameObjectComponent.currentGridPosition.equals(this.currentDestinationGridPosition)) {
            this.currentState = State.IDLE;
        } else {
            let nextNode = this._getNextNode(this.currentDestinationGridPosition);

            // If unable to move, stop and go idle.
            if (nextNode !== null) {
                this._setTargetGridPosition(nextNode);
            } else {
                this.currentState = State.IDLE;
            }
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

ActionComponent.prototype._setTargetGridPosition = function(pos) {
    // Facing direction.
    this._setFacingDirection(pos.x, pos.y);

    // Move speed.
    this.currentMoveSpeed = util.getMoveSpeed(this.currentFacingDirection, this.MOVE_SPEED.x, this.MOVE_SPEED.y);

    // Update current grid position.
    this.gameObjectComponent.setGridPosition(pos);

    // Target position.
    util.gridToWorldCoord(this.gameObjectComponent.currentGridPosition, this.currentTargetPosition);
    this.currentDistanceRemainingToTargetPosition = this.entity.position.distanceTo(this.currentTargetPosition);

    // Move direction.
    this.currentMoveDirection.setX(this.currentTargetPosition.x - this.entity.position.x);
    this.currentMoveDirection.setY(this.currentTargetPosition.y - this.entity.position.y);
    this.currentMoveDirection.normalize();
};

ActionComponent.prototype._setFacingDirection = function(x, y) {
    let facingDirection = util.getDirection(
        this.gameObjectComponent.currentGridPosition.x, this.gameObjectComponent.currentGridPosition.y,
        x, y);
    if (facingDirection !== -1) {
        this.currentFacingDirection = facingDirection;
    }
};

ActionComponent.prototype.isMoving = function() {
    return this.currentState === State.MOVE;
};

/**
 * From the current grid position, get the next node in the
 * direction of targetGridPosition that we will need to traverse
 * if moving in a straight line to the target.
 */
ActionComponent.prototype._getNextNode = function(targetGridPosition) {
    let direction = util.getDirection(
        this.gameObjectComponent.currentGridPosition.x, this.gameObjectComponent.currentGridPosition.y,
        targetGridPosition.x, targetGridPosition.y);

    assert(direction !== -1);

    let offset = util.getGridOffsetInDirection(direction);

    let nextNode = new Vector2(
        this.gameObjectComponent.currentGridPosition.x + offset.x,
        this.gameObjectComponent.currentGridPosition.y + offset.y);

    // Next node is not a collision? Move to it.
    if (!LevelController.checkCollision(nextNode)) {
        return nextNode;
    }

    // Collision! Local avoidance.

    // Next node is the destination but it's blocked. Stop movement.
    if (nextNode.equals(this.currentDestinationGridPosition)) {
        return null;
    }

    // Next node is not the destination but it's blocked. Attempt to strafe.
    let strafeDir = (direction + 1) % 8;
    offset = util.getGridOffsetInDirection(strafeDir);

    nextNode = new Vector2(
        this.gameObjectComponent.currentGridPosition.x + offset.x,
        this.gameObjectComponent.currentGridPosition.y + offset.y);

    if (!LevelController.checkCollision(nextNode)) {
        return nextNode;
    }

    // Strafe in other direction if blocked.
    strafeDir = ((direction - 1) + 8) % 8;
    offset = util.getGridOffsetInDirection(strafeDir);

    nextNode = new Vector2(
        this.gameObjectComponent.currentGridPosition.x + offset.x,
        this.gameObjectComponent.currentGridPosition.y + offset.y);

    if (!LevelController.checkCollision(nextNode)) {
        return nextNode;
    }

    return null;
};

ActionComponent.prototype.requestMove = function(targetGridPosition) {
    assert(this.currentState === State.IDLE ||
        this.currentState === State.MOVE);

    // If not currently moving, initialize the movement.
    // First node will be the current position. FollowPath routine
    // will handle transition to the next node in the destination direction.
    if (!this.isMoving()) {
        this.currentTargetPosition.copy(this.entity.position);
        this.currentDistanceRemainingToTargetPosition = 0.0;
    }

    this.currentState = State.MOVE;
    this.currentDestinationGridPosition.copy(targetGridPosition);

    return true;
};

ActionComponent.prototype.stopMoving = function() {
    if (this.isMoving()) {
        this.currentDestinationGridPosition.copy(this.gameObjectComponent.currentGridPosition);
    }
};

ActionComponent.prototype.isIdle = function() {
    return this.currentState === State.IDLE;
};

ActionComponent.prototype.idle = function() {
    this.currentState = State.IDLE;
};

ActionComponent.prototype.isAttacking = function() {
    return this.currentState === State.ATTACK;
};

ActionComponent.prototype.attackInDirection = function(gridPos) {
    assert(this.currentState === State.IDLE);

    this._setFacingDirection(gridPos.x, gridPos.y);
    this.animComponent.play('phalla_' + this.currentFacingDirection);
    this.currentState = State.ATTACK;
};

ActionComponent.prototype.takeDamage = function() {
    this.animComponent.play('phallh_' + this.currentFacingDirection);
    this.currentState = State.DAMAGE;
};

ActionComponent.prototype.die = function() {
    this.animComponent.play('phalld_' + this.currentFacingDirection);
    this.currentState = State.DEAD;
};

ActionComponent.prototype.faceDirection = function(gridPos) {
    assert(this.currentState === State.IDLE);

    this._setFacingDirection(gridPos.x, gridPos.y);
};

module.exports = ActionComponent;
