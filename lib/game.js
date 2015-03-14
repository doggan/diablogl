'use strict';

// Inherit EventEmitter to allow event listeners to be registered directly to this object.
require('inherits')(Game, require('events').EventEmitter);

function Game(options) {
    this.THREE = THREE;

    this.canvas = document.getElementById("canvas");
    if (!this.canvas) {
        throw "'canvas' element not found.";
    }

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this._initRenderer(options);

    this.prevTime = Date.now() / 1000;
    this.time = {
        // The time in seconds it took to complete the last frame.
        deltaTime: 0,
        // The total number of frames that have passed.
        frameCount: 0
    };

    document.addEventListener('keydown', this._onKeyDown.bind(this), false);
    document.addEventListener('keyup', this._onKeyUp.bind(this), false);
    this.keyStates = [];
}

Game.prototype._initRenderer = function(options) {
    var viewSize = this.height / 2;
    var aspectRatio = this.width / this.height;

    // Coordinate system: right hand rule (+z towards camera, -z away from camera).
    this.camera = new THREE.OrthographicCamera(-aspectRatio * viewSize, aspectRatio * viewSize,
        viewSize, -viewSize,
        0.1, 10000);
    this.camera.position.z = 10000;

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas
    });
    this.renderer.setClearColor(options.clearColor || 0xFFFFFF, 1);

    window.addEventListener('resize', this._onWindowResize.bind(this), false);
    this.canvas.addEventListener('mousedown', this._onCanvasMouseDown.bind(this), false);
    this.canvas.addEventListener('mouseup', this._onCanvasMouseUp.bind(this), false);
    this.canvas.addEventListener('mousemove', this._onCanvasMouseMove.bind(this), false);

    this.mouseButtonStates = [];
    this.mousePosition = new THREE.Vector2();
};

Game.prototype._onWindowResize = function() {
    this.emit('windowResize');
};

var InputState = {
    NONE: 0,
    DOWN: 1,
    UP: 2,
    PRESSED: 3,
};

var MouseButton = {
    LEFT: 1,
    RIGHT: 2,
    MIDDLE: 3,
};

function mouseEventToXY(game, event) {
    var x = 0;
    var y = 0;

    if (event.x !== undefined && event.y !== undefined) {
        x = event.x;
        y = event.y;
    }
    // Firefox method to get the position.
    else {
        x = event.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }

    x -= game.canvas.offsetLeft;
    y -= game.canvas.offsetTop;

    // Account window scrolling via scrollbars.
    x += window.pageXOffset;
    y += window.pageYOffset;

    // Flip y coordinate so that y = 0 is bottom.
    y = game.canvas.height - y - 1;

    return {
        x: x,
        y: y
    };
}

function mouseEventToButton(event) {
    return event.which || event.button;
}

/**
 * Was the mouse button pushed down this frame?
 */
Game.prototype.isMouseButtonDown = function( /*buttonIndex*/ ) {
    return this.mouseButtonStates[MouseButton.LEFT] === InputState.DOWN;
};

/**
 * Was the mouse button lifted up this frame?
 */
Game.prototype.isMouseButtonUp = function( /*buttonIndex*/ ) {
    return this.mouseButtonStates[MouseButton.LEFT] === InputState.UP;
};

/**
 * Is the mouse button pressed down?
 */
Game.prototype.isMouseButtonPressed = function( /*buttonIndex*/ ) {
    return this.mouseButtonStates[MouseButton.LEFT] === InputState.PRESSED;
};

Game.prototype._onCanvasMouseDown = function(event) {
    event.preventDefault();

    var button = mouseEventToButton(event);
    this.mouseButtonStates[button] = InputState.DOWN;
};

Game.prototype._onCanvasMouseUp = function(event) {
    event.preventDefault();

    var button = mouseEventToButton(event);
    this.mouseButtonStates[button] = InputState.UP;
};

Game.prototype._onCanvasMouseMove = function(event) {
    event.preventDefault();

    var mousePos = mouseEventToXY(this, event);
    this.mousePosition.set(mousePos.x, mousePos.y);
};

/**
 * Was the key pushed down this frame?
 */
Game.prototype.isKeyDown = function(keyCode) {
    return this.keyStates[keyCode] === InputState.DOWN;
};

/**
 * Was the key released this frame?
 */
Game.prototype.isKeyUp = function(keyCode) {
    return this.keyStates[keyCode] === InputState.UP;
};

/**
 * Is the key pressed down?
 */
Game.prototype.isKeyPressed = function(keyCode) {
    return this.keyStates[keyCode] === InputState.PRESSED;
};

Game.prototype._onKeyDown = function(event) {
    this.keyStates[event.keyCode] = InputState.DOWN;
};

Game.prototype._onKeyUp = function(event) {
    this.keyStates[event.keyCode] = InputState.UP;
};

/**
 * Start the game loop.
 */
Game.prototype.run = function() {
    this._update();
};

Game.prototype._update = function() {
    var time = Date.now() / 1000;
    this.time.deltaTime = time - this.prevTime;

    this.emit('update');
    this.emit('lateUpdate');

    this._render();
    this._updateInputStates();

    this.emit('frameEnd');

    this.time.frameCount += 1;
    this.prevTime = time;

    window.requestAnimationFrame(this._update.bind(this));
};

Game.prototype._updateInputStates = function() {
    // Mouse states.
    for (var i in this.mouseButtonStates) {
        switch (this.mouseButtonStates[i]) {
            case InputState.DOWN:
                this.mouseButtonStates[i] = InputState.PRESSED;
                break;
            case InputState.UP:
                this.mouseButtonStates[i] = InputState.NONE;
                break;
        }
    }

    // Key states.
    for (i in this.keyStates) {
        switch (this.keyStates[i]) {
            case InputState.DOWN:
                this.keyStates[i] = InputState.PRESSED;
                break;
            case InputState.UP:
                this.keyStates[i] = InputState.NONE;
                break;
        }
    }
};

Game.prototype._render = function() {
    this.emit('render');

    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
};

module.exports = Game;
