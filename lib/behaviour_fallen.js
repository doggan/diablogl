'use strict';

let inherits = require('inherits'),
    Component = require('./core/component'),
    THREE = require('three');

let LevelController = require('./level_controller'),
    util = require('./util');

let bt = require('behavior-tree');

function buildBehaviorTree(fallen) {
    let idle =
        bt.Sequence()
        .addChild(bt.Action({
            update: fallen._idleAction.bind(fallen)
        }));

    let attack =
        bt.Sequence()
        .addChild(bt.Action({
            update: fallen._moveToTargetAction.bind(fallen)
        }))
        .addChild(bt.Sequence()
            .addChild(bt.Action({
                update: fallen._attackTargetAction.bind(fallen)
            }))
            .addChild(bt.Action({
                update: fallen._attackTargetWaitAction.bind(fallen)
            }))
        );

    let retreat =
        bt.Sequence()
        .addChild(bt.Action({
            update: fallen._selectRetreatPointAction.bind(fallen)
        }))
        .addChild(bt.Action({
            update: fallen._moveToRetreatPointAction.bind(fallen)
        }))
        .addChild(bt.WaitAction(2));

    return bt.PrioritySelector()
        .addChild(retreat, fallen._checkRetreatCondition.bind(fallen))
        .addChild(attack, fallen._checkAttackCondition.bind(fallen))
        .addChild(idle);
}

let START_HEALTH = 2;

function BehaviourFallen(entity) {
    Component.call(this, entity);

    this.game = entity.game;
    this.THREE = this.game.THREE;

    this.health = START_HEALTH;
    this.isDead = false;

    this.deadElapsedTime = 0;

    this.entity.addSignalListener('damage', this._onDamaged.bind(this));

    this.targetEntity = null;
    this.shouldRetreat = false;
}

inherits(BehaviourFallen, Component);

BehaviourFallen.prototype._idleAction = function() {
    // console.log('idle...');
    this.actionComponent.stopMoving();
    return bt.Status.SUCCESS;
};

BehaviourFallen.prototype._checkRetreatCondition = function() {
    if (!this.actionComponent.isIdle()) {
        return false;
    }

    if (this.shouldRetreat) {
        return true;
    }

    // if (this.game.isKeyDown(49)) {
    //     console.log('RETREAT!');
    //     return true;
    // }

    return false;
};

BehaviourFallen.prototype._selectRetreatPointAction = function() {
    console.log('select retreat point');

    let currentPosition = this.gameObjectComponent.currentGridPosition;

    let xOffset = util.getRandomInt(3, 5);
    if (util.getRandomInt(0, 2) === 0) {
        xOffset *= -1;
    }
    let yOffset = util.getRandomInt(3, 5);
    if (util.getRandomInt(0, 2) === 0) {
        yOffset *= -1;
    }

    let retreatPosition = new THREE.Vector2(currentPosition.x - xOffset, currentPosition.y - yOffset);

    this.actionComponent.requestMove(retreatPosition);

    return bt.Status.SUCCESS;
};

BehaviourFallen.prototype._moveToRetreatPointAction = function() {
    // console.log('retreating...');

    if (this.actionComponent.isMoving()) {
        return bt.Status.RUNNING;
    }

    this.shouldRetreat = false;
    return bt.Status.SUCCESS;
};

let FOLLOW_RANGE = 8;

BehaviourFallen.prototype._checkAttackCondition = function() {
    if (!this.actionComponent.isIdle()) {
        return false;
    }

    // Target selection.
    this.targetEntity = LevelController.getNearestPlayerInRange(this.gameObjectComponent.currentGridPosition, FOLLOW_RANGE);

    if (this.targetEntity !== null) {
        // console.log('go!!!');
        return true;
    }

    return false;
};

BehaviourFallen.prototype._moveToTargetAction = function() {
    if (this.targetEntity === null) {
        return bt.Status.FAILURE;
    }

    let targetGridPos = this.targetEntity.getComponent('GameObjectComponent').currentGridPosition;
    let myGridPos = this.gameObjectComponent.currentGridPosition;
    let diffX = Math.abs(targetGridPos.x - myGridPos.x);
    let diffY = Math.abs(targetGridPos.y - myGridPos.y);

    // Too far.
    if (diffX + diffY > (FOLLOW_RANGE * 2)) {
        return bt.Status.FAILURE;
    }

    if (diffX <= 1 && diffY <= 1) {
        if (this.actionComponent.isMoving()) {
            this.actionComponent.stopMoving();
            return bt.Status.RUNNING;
        } else {
            return bt.Status.SUCCESS;
        }
    }

    let breadCrumb = LevelController.getNewestBreadcrumb(0, myGridPos);
    if (!breadCrumb) {
        return bt.Status.FAILURE;
    }

    // {
    //     let p = new THREE.Vector2();
    //     util.gridToWorldCoord(breadCrumb.gridPosition, p);
    //     p.z = 1000;
    //     DbgDraw.drawSphere(p, 8.0, 'magenta');
    // }

    this.actionComponent.requestMove(breadCrumb.gridPosition);

    // console.log('moving to target');
    return bt.Status.RUNNING;
};

BehaviourFallen.prototype._attackTargetAction = function() {
    // TODO: what should happen if we're about to attack but we get attacked?
    if (!this.actionComponent.isIdle()) {
        return bt.Status.FAILURE;
    }

    this.actionComponent.attackInDirection(this.targetEntity.getComponent('GameObjectComponent').currentGridPosition);

    // console.log('do attack!');

    return bt.Status.SUCCESS;
};

BehaviourFallen.prototype._attackTargetWaitAction = function() {
    if (this.actionComponent.isAttacking()) {
        return bt.Status.RUNNING;
    }

    return bt.Status.SUCCESS;
};

BehaviourFallen.prototype._onDamaged = function(info) {
    if (this.isDead) {
        return;
    }

    // console.log('take damage: ' + info.amount);

    this.health -= 1;

    if (this.health <= 0) {
        this.isDead = true;

        this.deadElapsedTime = 0;

        // Don't allow targeting while dead.
        this.entity.getComponent('GameObjectComponent').isTargetable = false;

        this.actionComponent.die();

        // TODO:
        // Alert player.
        info.fromEntity.getComponent('ActionComponent').TEMP_onEnemyKilled();

        // TODO: alert all other enemies and set retreat flag
        let enemies = LevelController.TEMP_getEnemies();
        for (let i = 0; i < enemies.length; i++) {
            if (!enemies[i].getComponent('BehaviourFallen').isDead) {
                enemies[i].getComponent('BehaviourFallen').shouldRetreat = true;
            }
        }
    } else {
        this.actionComponent.takeDamage();
    }
};

BehaviourFallen.prototype.TEMP_respawn = function() {
    this.health = START_HEALTH;
    this.actionComponent.idle();

    this.isDead = false;

    this.entity.getComponent('GameObjectComponent').isTargetable = true;
};

BehaviourFallen.prototype.start = function() {
    this.animComponent = this.entity.getComponent('AnimComponent');

    this._registerAnimEvents();

    this.tree = buildBehaviorTree(this);

    this.actionComponent = this.entity.getComponent('ActionComponent');
    this.gameObjectComponent = this.entity.getComponent('GameObjectComponent');
};

BehaviourFallen.prototype._registerAnimEvents = function() {
    // TODO: cleaner way to do this for all 8 directions?

    let i;
    let self = this;

    function doDieEnd() {
        self.animComponent.stop();
    }

    for (i = 0; i < 8; i++) {
        this.animComponent.registerCallback('phalld_' + i, doDieEnd);
    }
};

BehaviourFallen.prototype.update = function() {
    if (this.isDead) {
        this.deadElapsedTime += this.game.time.deltaTime;

        if (this.deadElapsedTime >= 5) {
            this.TEMP_respawn();
        }
    }

    this.tree.tick();
};

module.exports = BehaviourFallen;
