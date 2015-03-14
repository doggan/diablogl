'use strict';

var inherits = require('inherits'),
    Component = require('./../core/component'),
    assert = require('assert'),
    Stately = require('stately.js'),
    util = require('./../util');

function InputControllerComponent(entity) {
    Component.call(this, entity);

    this.game = entity.game;

    this.mouseWorldPosition = new THREE.Vector2();
    this.mouseGridPosition = new THREE.Vector2();
    this.nextAction = null;

    this.currentTargetThisFrame = null;
    this.currentMoveToTarget = null;
    this.previousMoveToGridPosition = new THREE.Vector2();

    this.fsm = null;
    this.fsmOnUpdate = null;
}

inherits(InputControllerComponent, Component);

InputControllerComponent.prototype.start = function() {
    this.actionComponent = this.entity.getComponent('ActionComponent');
    this.gameObjectComponent = this.entity.getComponent('GameObjectComponent');

    // Define FSM.
    var stateDesc = {
        'Idle': {
            toMove: function() {
                return this.Move;
            },
            toAttack: function() {
                return this.Attack;
            },
            toMoveToTarget: function() {
                return this.MoveToTarget;
            }
        },
        'Move': {
            toIdle: function() {
                return this.Idle;
            },
            toAttack: function() {
                return this.Attack;
            },
            toMoveToTarget: function() {
                return this.MoveToTarget;
            }
        },
        'Attack': {
            toIdle: function() {
                return this.Idle;
            },
            toMove: function() {
                return this.Move;
            },
            toMoveToTarget: function() {
                return this.MoveToTarget;
            }
        },
        'MoveToTarget': {
            toIdle: function() {
                return this.Idle;
            },
            toAttack: function() {
                return this.Attack;
            },
            toMove: function() {
                return this.Move;
            }
        }
    };

    // Initialize.
    this.fsm = Stately.machine(stateDesc, 'Idle');
    this.fsmOnUpdate = this._updateIdle;

    // Set callbacks.
    var self = this;
    this.fsm.onenterIdle = function() {
        self.fsmOnUpdate = self._updateIdle;
    };
    this.fsm.onenterMove = function() {
        self.fsmOnUpdate = self._updateMove;
    };
    this.fsm.onenterAttack = function() {
        self.fsmOnUpdate = self._updateAttack;
    };
    this.fsm.onenterMoveToTarget = function() {
        self.fsmOnUpdate = self._updateMoveToTarget;

        assert(self.currentMoveToTarget !== null);
        self.previousMoveToGridPosition = getTargetGridPosition(self.currentMoveToTarget);
    };
    this.fsm.onleaveMoveToTarget = function() {
        self.currentMoveToTarget = null;
    };
};

// TODO: refactor 'action queue' system to use a single object: { name: ATTACK, params... }
var Action = {
    MOVE: 0,
    ATTACK: 1,
    MOVE_TO_TARGET: 2
};

InputControllerComponent.prototype.update = function() {
    var mousePos = this.game.mousePosition;
    util.screenToWorldCoord(this.game.width, this.game.height, mousePos, this.game.camera, this.mouseWorldPosition);
    util.worldToGridCoord(this.mouseWorldPosition, this.mouseGridPosition);

    this._updateTarget();
    this.fsmOnUpdate();
};

var LevelController = require('./../level_controller');
var Signals = require('./../signals');

InputControllerComponent.prototype._updateTarget = function() {
    var enemy = LevelController.getNearestEnemyWorldPos(this.mouseWorldPosition);
    if (enemy) {
        Signals.sendTarget(enemy);
        this.currentTargetThisFrame = enemy;
    } else {
        this.currentTargetThisFrame = null;
    }
};

// TODO: move to input system
var KeyCode = {
    SHIFT: 16
};

function getTargetGridPosition(targetEntity) {
    // TODO:
    var goComponent = targetEntity.getComponent('GameObjectComponent');
    return goComponent.currentGridPosition.clone();
}

InputControllerComponent.prototype._clearNextAction = function() {
    this.nextAction = null;
};

InputControllerComponent.prototype._hasNextAction = function() {
    return this.nextAction !== null;
};

function createAttackAction(attackPos) {
    return {
        type: Action.ATTACK,
        pos: attackPos.clone()
    };
}

function createMoveAction(movePos) {
    return {
        type: Action.MOVE,
        pos: movePos.clone()
    };
}

function createMoveToAction(target) {
    return {
        type: Action.MOVE_TO_TARGET,
        target: target
    };
}

InputControllerComponent.prototype._updateIdle = function() {
    if (this.game.isMouseButtonDown()) {
        if (this.game.isKeyPressed(KeyCode.SHIFT)) {
            this.actionComponent.attackInDirection(this.mouseGridPosition);
            this.fsm.toAttack();
        } else if (this.currentTargetThisFrame) {
            var targetPos = getTargetGridPosition(this.currentTargetThisFrame);
            if (this.actionComponent.requestMove(targetPos, true)) {
                this.currentMoveToTarget = this.currentTargetThisFrame;
                this.fsm.toMoveToTarget();
            }
        } else if (this.actionComponent.requestMove(this.mouseGridPosition)) {
            this.fsm.toMove();
        }
    }
};

InputControllerComponent.prototype._updateMove = function() {
    if (this.game.isMouseButtonDown()) {
        if (this.game.isKeyPressed(KeyCode.SHIFT)) {
            this.actionComponent.stopMoving();
            this.nextAction = createAttackAction(this.mouseGridPosition);
        } else if (this.currentTargetThisFrame) {
            this.actionComponent.stopMoving();
            this.nextAction = createMoveToAction(this.currentTargetThisFrame);
        } else {
            if (this.actionComponent.requestMove(this.mouseGridPosition)) {
                // Continue moving...
            } else {
                this.actionComponent.stopMoving();
            }

            this._clearNextAction();
        }
    }

    if (this.game.isMouseButtonPressed()) {
        if (this._hasNextAction()) {
            // Something is queued... don't overwrite it with a mouse press
        } else {
            if (this.actionComponent.requestMove(this.mouseGridPosition)) {
                // Continue moving...
            } else {
                this.actionComponent.stopMoving();
            }
        }
    }

    if (!this.actionComponent.isMoving()) {
        var didTransition = false;
        if (this._hasNextAction()) {
            switch (this.nextAction.type) {
                case Action.ATTACK:
                    this.actionComponent.attackInDirection(this.nextAction.pos);
                    this.fsm.toAttack();
                    didTransition = true;
                    break;
                case Action.MOVE_TO_TARGET:
                    var targetPos = getTargetGridPosition(this.nextAction.target);
                    if (this.actionComponent.requestMove(targetPos, true)) {
                        this.currentMoveToTarget = this.nextAction.target;
                        this.fsm.toMoveToTarget();
                        didTransition = true;
                    }
                    break;
            }

            this._clearNextAction();
        }

        if (!didTransition) {
            this.fsm.toIdle();
        }
    }
};

InputControllerComponent.prototype._updateAttack = function() {
    if (this.game.isMouseButtonDown()) {
        if (this.game.isKeyPressed(KeyCode.SHIFT)) {
            this.nextAction = createAttackAction(this.mouseGridPosition);
        } else if (this.currentTargetThisFrame) {
            this.nextAction = createMoveToAction(this.currentTargetThisFrame);
        } else {
            this.nextAction = createMoveAction(this.mouseGridPosition);
        }
    }

    if (!this.actionComponent.isAttacking()) {
        var didTransition = false;
        if (this._hasNextAction()) {
            switch (this.nextAction.type) {
                case Action.ATTACK:
                    this.actionComponent.attackInDirection(this.nextAction.pos);
                    didTransition = true;
                    break;
                case Action.MOVE_TO_TARGET:
                    var targetPos = getTargetGridPosition(this.nextAction.target);
                    if (this.actionComponent.requestMove(targetPos, true)) {
                        this.currentMoveToTarget = this.nextAction.target;
                        this.fsm.toMoveToTarget();
                        didTransition = true;
                    }
                    break;
                case Action.MOVE:
                    if (this.actionComponent.requestMove(this.nextAction.pos)) {
                        this.fsm.toMove();
                        didTransition = true;
                    }
                    break;
            }

            this._clearNextAction();
        }

        if (!didTransition) {
            this.fsm.toIdle();
        }
    }
};

InputControllerComponent.prototype._updateMoveToTarget = function() {
    assert(this.currentMoveToTarget !== null);

    if (this.game.isMouseButtonDown()) {
        if (this.game.isKeyPressed(KeyCode.SHIFT)) {
            this.actionComponent.stopMoving();
            this.nextAction = createAttackAction(this.mouseGridPosition);
        } else if (this.currentTargetThisFrame) {
            if (this.currentTargetThisFrame !== this.currentMoveToTarget) {
                // New target!
                this.currentMoveToTarget = this.currentTargetThisFrame;
            }
        } else {
            if (!this.actionComponent.requestMove(this.mouseGridPosition)) {
                this.actionComponent.stopMoving();
            }

            this.fsm.toMove();
            this.currentMoveToTarget = null;
            this._clearNextAction();
        }
    }

    // TODO: handle transitions in case move target disappears (dies, etc)

    if (!this.currentMoveToTarget) {
        return;
    }

    var currentMoveToGridPosition = getTargetGridPosition(this.currentMoveToTarget);

    // If our target position changed, re-pathfind.
    if (!currentMoveToGridPosition.equals(this.previousMoveToGridPosition)) {
        if (!this.actionComponent.requestMove(currentMoveToGridPosition, true)) {
            this.actionComponent.stopMoving();
        }

        this.previousMoveToGridPosition.copy(currentMoveToGridPosition);
    }

    if (!this.actionComponent.isMoving()) {
        var didTransition = false;
        if (this._hasNextAction()) {
            switch (this.nextAction.type) {
                case Action.ATTACK:
                    this.actionComponent.attackInDirection(this.nextAction.pos);
                    this.fsm.toAttack();
                    didTransition = true;
                    break;
            }

            this._clearNextAction();
        }

        if (!didTransition) {
            var distanceFromTarget = util.getGridDistance(currentMoveToGridPosition, this.gameObjectComponent.currentGridPosition);
            if (distanceFromTarget === 1) {
                // Depending on target type, our action is different.
                if (this.currentMoveToTarget.getComponent('BehaviourFallen')) {
                    // Enemy.
                    this.actionComponent.attackInDirection(currentMoveToGridPosition);
                    this.fsm.toAttack();
                } else {
                    // NPC.
                    this.actionComponent.faceDirection(currentMoveToGridPosition);
                    Signals.sendInteract(this.entity, this.currentMoveToTarget);
                    this.fsm.toIdle();
                }
            } else {
                this.fsm.toIdle();
            }
        }
    }
};

module.exports = InputControllerComponent;
