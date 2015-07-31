'use strict';

let App = require('../app'),
    assert = require('assert'),
    SpriteMgr = require('./../core/sprite_mgr');

class AnimComponent {
    constructor() {
        let fps = 30; // TODO:
        this.timePerFrame = 1 / fps;
        this.currentFrame = 0;
        this.elapsedTime = 0;

        this.currentSprite = null;
        this.currentAnimName = null;

        this.forceImmediateChange = false;
        this.callbacks = {};
    }

    start() {
        this.spriteComponent = this.entity.getComponent('SpriteComponent');

        // TODO:
        this.play('wlsas_' + 0);
    }

    registerCallback(animName, frameNum, callback) {
        if (!this.callbacks.hasOwnProperty(animName)) {
            this.callbacks[animName] = {};
        }

        let entry = this.callbacks[animName];

        // If a frame number is not specified, use the last frame.
        if (isNaN(frameNum)) {
            let sprite = SpriteMgr.getSprite(animName);
            if (!sprite) {
                console.warn('Animation data for [' + animName + '] not found. Unable to register callback.');
                return;
            }

            callback = frameNum; // callback was second parameter
            frameNum = sprite.length - 1;
        }

        if (entry.hasOwnProperty(frameNum)) {
            console.warn('Callback already registered for [' + animName + '] at frame [' + frameNum + ']');
            return;
        }

        entry[frameNum] = callback;
    }

    play(animName) {
        // Already playing?
        if (this.currentAnimName === animName) {
            return;
        }

        let sprite = SpriteMgr.getSprite(animName);
        if (!sprite) {
            console.warn('Unable to play animation: ' + animName);
            return;
        }

        // console.log('Play [' + animName + '].');
        this.currentSprite = sprite;
        this.currentAnimName = animName;
        this.currentFrame = 0;
        this.elapsedTime = 0;

        this.forceImmediateChange = true;
    }

    stop() {
        this.currentSprite = null;
    }

    update() {
        if (!this.currentSprite) {
            this.elapsedTime = 0;
            return;
        }

        if (this.forceImmediateChange) {
            this._onChangeFrame();
            this.forceImmediateChange = false;
        }

        if (this.elapsedTime > this.timePerFrame) {
            // Current frame is finished - trigger callback.
            this._doCallback(this.currentAnimName, this.currentFrame);

            // If the callback stopped the animation, exit.
            if (!this.currentSprite) {
                return;
            }

            // Start next frame.
            this.currentFrame = (this.currentFrame + 1) % this.currentSprite.length;
            this._onChangeFrame();
            this.elapsedTime = 0;
        } else {
            this.elapsedTime += App.deltaTime;
        }
    }

    _doCallback(animName, frameNum) {
        let entry = this.callbacks[animName];
        if (entry) {
            entry = entry[frameNum];
            if (entry) {
                entry();
            }
        }
    }

    _onChangeFrame() {
        assert(this.currentSprite !== null);
        assert(this.currentFrame < this.currentSprite.length);

        this.spriteComponent.setSprite(this.currentSprite[this.currentFrame]);
    }
}

module.exports = function(options) {
    return new AnimComponent(options);
};
