'use strict';

let THREE = require('three'),
    App = require('../app'),
    assert = require('assert'),
    Stately = require('stately.js'),
    util = require('./../util');

// let LevelController = require('./../level_controller');
let Signals = require('./../signals');

// TODO: refactor 'action queue' system to use a single object: { name: ATTACK, params... }
let Action = {
    MOVE: 0,
    ATTACK: 1,
    MOVE_TO_TARGET: 2
};

// TODO: move to input system
let KeyCode = {
    SHIFT: 16
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

function getTargetGridPosition(targetEntity) {
    // TODO:
    let goComponent = targetEntity.getComponent('GameObjectComponent');
    return goComponent.currentGridPosition.clone();
}

class InputControllerComponent {
    constructor() {
        this.mouseWorldPosition = new THREE.Vector2();
        this.mouseGridPosition = new THREE.Vector2();
        this.nextAction = null;

        this.currentTargetThisFrame = null;
        this.currentMoveToTarget = null;
        this.previousMoveToGridPosition = new THREE.Vector2();

        this.fsm = null;
        this.fsmOnUpdate = null;
    }

    start() {
        this.actionComponent = this.entity.getComponent('PlayerActionComponent');
        this.gameObjectComponent = this.entity.getComponent('PlayerComponent');

        // Define FSM.
        let stateDesc = {
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
        let self = this;
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
    }

    update() {
        let mousePos = App.inputSystem.getMousePosition();
        util.screenToWorldCoord(600, 400, mousePos, App.activeCamera, this.mouseWorldPosition);
        util.worldToGridCoord(this.mouseWorldPosition, this.mouseGridPosition);

        this._updateTarget();
        this.fsmOnUpdate();
    }

    _updateTarget() {
        // let enemy = LevelController.getNearestEnemyWorldPos(this.mouseWorldPosition);
        // if (enemy) {
        //     Signals.sendTarget(enemy);
        //     this.currentTargetThisFrame = enemy;
        // } else {
        //     this.currentTargetThisFrame = null;
        // }
    }

    _clearNextAction() {
        this.nextAction = null;
    }

    _hasNextAction() {
        return this.nextAction !== null;
    }

    _updateIdle() {
        let InputSystem = App.inputSystem;
        if (InputSystem.isMouseButtonDown(InputSystem.MouseButton.LEFT)) {
            if (InputSystem.isKeyPressed(KeyCode.SHIFT)) {
                this.actionComponent.attackInDirection(this.mouseGridPosition);
                this.fsm.toAttack();
            } else if (this.currentTargetThisFrame) {
                let targetPos = getTargetGridPosition(this.currentTargetThisFrame);
                if (this.actionComponent.requestMove(targetPos, true)) {
                    this.currentMoveToTarget = this.currentTargetThisFrame;
                    this.fsm.toMoveToTarget();
                }
            } else if (this.actionComponent.requestMove(this.mouseGridPosition)) {
                this.fsm.toMove();
            }
        }
    }

    _updateMove() {
        let InputSystem = App.inputSystem;
        if (InputSystem.isMouseButtonDown(InputSystem.MouseButton.LEFT)) {
            if (InputSystem.isKeyPressed(KeyCode.SHIFT)) {
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

        if (InputSystem.isMouseButtonPressed(InputSystem.MouseButton.LEFT)) {
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
            let didTransition = false;
            if (this._hasNextAction()) {
                switch (this.nextAction.type) {
                    case Action.ATTACK:
                        this.actionComponent.attackInDirection(this.nextAction.pos);
                        this.fsm.toAttack();
                        didTransition = true;
                        break;
                    case Action.MOVE_TO_TARGET:
                        let targetPos = getTargetGridPosition(this.nextAction.target);
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
    }

    _updateAttack() {
        let InputSystem = App.inputSystem;
        if (InputSystem.isMouseButtonDown(InputSystem.MouseButton.LEFT)) {
            if (InputSystem.isKeyPressed(KeyCode.SHIFT)) {
                this.nextAction = createAttackAction(this.mouseGridPosition);
            } else if (this.currentTargetThisFrame) {
                this.nextAction = createMoveToAction(this.currentTargetThisFrame);
            } else {
                this.nextAction = createMoveAction(this.mouseGridPosition);
            }
        }

        if (!this.actionComponent.isAttacking()) {
            let didTransition = false;
            if (this._hasNextAction()) {
                switch (this.nextAction.type) {
                    case Action.ATTACK:
                        this.actionComponent.attackInDirection(this.nextAction.pos);
                        didTransition = true;
                        break;
                    case Action.MOVE_TO_TARGET:
                        let targetPos = getTargetGridPosition(this.nextAction.target);
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
    }

    _updateMoveToTarget() {
        assert(this.currentMoveToTarget !== null);

        let InputSystem = App.inputSystem;
        if (InputSystem.isMouseButtonDown(InputSystem.MouseButton.LEFT)) {
            if (InputSystem.isKeyPressed(KeyCode.SHIFT)) {
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

        let currentMoveToGridPosition = getTargetGridPosition(this.currentMoveToTarget);

        // If our target position changed, re-pathfind.
        if (!currentMoveToGridPosition.equals(this.previousMoveToGridPosition)) {
            if (!this.actionComponent.requestMove(currentMoveToGridPosition, true)) {
                this.actionComponent.stopMoving();
            }

            this.previousMoveToGridPosition.copy(currentMoveToGridPosition);
        }

        if (!this.actionComponent.isMoving()) {
            let didTransition = false;
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
                let distanceFromTarget = util.getGridDistance(currentMoveToGridPosition, this.gameObjectComponent.currentGridPosition);
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
    }
}

module.exports = function(options) {
    return new InputControllerComponent(options);
};
