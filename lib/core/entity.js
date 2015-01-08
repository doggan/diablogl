'use strict';

var Vector2 = THREE.Vector2,
    EventEmitter = require("events").EventEmitter;

function Entity (game) {
    this.game = game;
    this.position = new Vector2();
    this.components = [];
    this.updateableComponents = [];
    this.eventEmitter = new EventEmitter();

    this.game.on('update', this._update.bind(this));

    this.didCallStart = false;
}

Entity.prototype._start = function () {
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].startImpl();
    }

    this.didCallStart = true;
};

Entity.prototype.destroy = function() {
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].destroy();
    }

    this.eventEmitter.removeAllListeners();
    this.game.removeListener('update', this._update.bind(this));
};

/**
 * Add a component to this entity.
 */
Entity.prototype.addComponent = function(component) {
    this.components.push(component);

    if (component.requireUpdate) {
        this.updateableComponents.push(component);
    }
};

/**
 * Gets a component by class (constructor) name.
 * Returns null if the component is not found.
 */
Entity.prototype.getComponent = function(componentName) {
    for (var i = 0; i < this.components.length; i++) {
        if (this.components[i].constructor.name == componentName) {
            return this.components[i];
        }
    }

    return null;
};

/**
 * Send a signal to the entity which can be handled by a component
 * of this entity.
 */
Entity.prototype.sendSignal = function (signalType) {
    switch (arguments.length) {
        case 1:
            this.eventEmitter.emit(signalType);
            break;
        case 2:
            this.eventEmitter.emit(signalType, arguments[1]);
            break;
        case 3:
            this.eventEmitter.emit(signalType, arguments[1], arguments[2]);
            break;
        default:
            // Slowest case - for multiple arguments.
            var len = arguments.length;
            var args = new Array(len - 1);
            for (var i = 1; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            this.eventEmitter.emit(signalType, args);
    }
};

/**
 * Add a listener to handle the given signal type.
 */
Entity.prototype.addSignalListener = function (signalType, listener) {
    this.eventEmitter.addListener(signalType, listener);
};

/**
 * Remove a listener from handling the given signal type.
 */
Entity.prototype.removeSignalListener = function (signalType, listener) {
    this.eventEmitter.removeListener(signalType, listener);
};

Entity.prototype._update = function() {
    // Trigger 'start' on first update.
    if (!this.didCallStart) {
        this._start();
    }

    for (var i = 0; i < this.updateableComponents.length; i++) {
        this.updateableComponents[i].update();
    }
};

module.exports = Entity;
