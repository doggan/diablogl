'use strict';

let LevelController = require('./level_controller'),
    PathFinding = require('pathfinding'),
    vec2_normalize = require('gl-vec2/normalize'),
    vec2_distance = require('gl-vec2/distance'),
    vec2_subtract = require('gl-vec2/subtract');

const STATES = {
    Idle: 0,
    Walk: 1,
};

class Player {
    constructor(game, parentGroup) {
        this._sprite = parentGroup.create(0, 0, 'characters/skeleton');
        this._sprite.anchor.set(0.5, 0.75);

        const ANIM_NAME = 'idle';

        const FRAME_RATE = 10;
        const LOOP = true;
        const USE_NUMERIC_INDEX = false;
        const ZERO_PAD = 3;
        for (let i = 0; i < 8; i++) {
            let directionString = ANIM_NAME + '/' + i;
            let frameNames = Phaser.Animation.generateFrameNames(
                directionString + '/', 0, 9, '', ZERO_PAD);
            let reverseFrameNames = frameNames.slice(1, -1);
            reverseFrameNames.reverse();
            frameNames = frameNames.concat(reverseFrameNames);
            this._sprite.animations.add(
                directionString,
                frameNames,
                FRAME_RATE, LOOP, USE_NUMERIC_INDEX);
        }

        this._sprite.animations.play(ANIM_NAME + '/0');

        game.input.onDown.add(this.tempOnClick, this);

        this._currentState = STATES.Idle;
        this._currentTilePos = [0, 0];
        this._currentTargetTilePos = this._currentTilePos.slice();
        this._currentTargetPos = [0, 0];
        this._currentDistanceRemainingToTargetPos = 0;
        this._pathfinder = new PathFinding.AStarFinder({
            allowDiagonal: true,
            dontCrossCorners: true
        });
        this._currentPath = null;
        this._currentPathIndex = -1;
        this._currentMoveDirection = [0, 0];

        this.MOVE_SPEED = 2;
    }

    get position() {
        let worldPos = [this._sprite.position.x, this._sprite.position.y];
        return LevelController.map.worldToVirtualPos(worldPos);
    }
    set position(virtualPos) {
        let worldPos = LevelController.map.virtualToWorldPos(virtualPos);
        this._sprite.position.set(worldPos[0], worldPos[1]);
    }

    get sprite() { return this._sprite; }

    tempOnClick(pointer) {
        let map = LevelController.map;
        let mouseWorldPos = [pointer.worldX, pointer.worldY];
        let tilePos = map.worldToTilePos(mouseWorldPos);
        this.requestMove(tilePos);
    }

    update(game, dt) {
        if (this._currentState == STATES.Walk) {
            this._followPath(dt);
        }

        // let speed = 250;
        // if (game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
        //     this.sprite.y -= speed * dt;
        // } else if (game.input.keyboard.isDown(Phaser.Keyboard.DOWN)) {
        //     this.sprite.y += speed * dt;
        // }
        // if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
        //     this.sprite.x -= speed * dt;
        // } else if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
        //     this.sprite.x += speed * dt;
        // }
    }

    requestMove(targetTilePos) {
        if (!LevelController.map.isValidTilePos(targetTilePos)) {
            return;
        }
        let path = this._pathfinder.findPath(
            this._currentTilePos[0], this._currentTilePos[1],
            targetTilePos[0], targetTilePos[1],
            LevelController.collisionGrid);

        // No path.
        if (path.length < 2) {
            console.log('no path');
            return;
        }

        this._currentState = STATES.Walk;
        this._currentPath = path;
        this._currentPathIndex = 0;
        console.log('path found');
        console.log(path);

        this._setTargetTilePos(path[this._currentPathIndex]);
    }

    _setTargetTilePos(targetTilePos) {
        // Update current grid position.
        this._currentTilePos = targetTilePos;

        // Target position.
        this._currentTargetPos = LevelController.map.tileToVirtualPos(targetTilePos);
        this._currentDistanceRemainingToTargetPos =
            vec2_distance(this.position, this._currentTargetPos);

        // Move direction.
        vec2_subtract(this._currentMoveDirection, this._currentTargetPos, this.position);
        vec2_normalize(this._currentMoveDirection, this._currentMoveDirection);
        console.log(this._currentMoveDirection);
    }

    _followPath(dt) {
        let moveAmount = this.MOVE_SPEED * dt;
        this._currentDistanceRemainingToTargetPos -= moveAmount;

        // Arrived at target position?
        if (this._currentDistanceRemainingToTargetPos <= 0.0) {
            this.position = this._currentTargetPos;
            this._currentDistanceRemainingToTargetPos = 0.0;

            // End of path?
            if (this._isEndOfPath()) {
                this._currentPath = null;
                this._currentState = STATES.Idle;
            } else {
                // To next node.
                this._currentPathIndex++;
                this._setTargetTilePos(this._currentPath[this._currentPathIndex]);
            }
        } else {
            let current_pos = this.position;
            this.position = [
                current_pos[0] + this._currentMoveDirection[0] * moveAmount,
                current_pos[1] + this._currentMoveDirection[1] * moveAmount
            ];
        }
    }

    _isEndOfPath() {
        if (!this._currentPath ||
            (this._currentPathIndex + 1) >= this._currentPath.length) {
            return true;
        }

        return false;
    }
}

exports.Player = Player;
