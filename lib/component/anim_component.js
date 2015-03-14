'use strict';

var inherits = require('inherits'),
    Component = require('./../core/component'),
    assert = require('assert'),
    SpriteMgr = require('./../core/sprite_mgr');

function AnimComponent(entity) {
    Component.call(this, entity);

    this.game = entity.game;

    var fps = 30; // TODO:
    this.timePerFrame = 1 / fps;
    this.currentFrame = 0;
    this.elapsedTime = 0;

    this.currentSprite = null;
    this.currentAnimName = null;

    this.forceImmediateChange = false;
    this.callbacks = {};
}

inherits(AnimComponent, Component);

AnimComponent.prototype.start = function() {
    this.spriteComponent = this.entity.getComponent('SpriteComponent');
};

AnimComponent.prototype.registerCallback = function(animName, frameNum, callback) {
    if (!this.callbacks.hasOwnProperty(animName)) {
        this.callbacks[animName] = {};
    }

    var entry = this.callbacks[animName];

    // If a frame number is not specified, use the last frame.
    if (isNaN(frameNum)) {
        var sprite = SpriteMgr.getSprite(animName);
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
};

AnimComponent.prototype.play = function(animName) {
    // Already playing?
    if (this.currentAnimName === animName) {
        return;
    }

    var sprite = SpriteMgr.getSprite(animName);
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
};

AnimComponent.prototype.stop = function() {
    this.currentSprite = null;
};

AnimComponent.prototype.update = function() {
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
        this.elapsedTime += this.game.time.deltaTime;
    }
};

AnimComponent.prototype._doCallback = function(animName, frameNum) {
    var entry = this.callbacks[animName];
    if (entry) {
        entry = entry[frameNum];
        if (entry) {
            entry();
        }
    }
};

AnimComponent.prototype._onChangeFrame = function() {
    assert(this.currentSprite !== null);
    assert(this.currentFrame < this.currentSprite.length);

    this.spriteComponent.setSprite(this.currentSprite[this.currentFrame]);
};

module.exports = AnimComponent;
