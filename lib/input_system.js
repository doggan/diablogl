let InputState = {
    NONE: 0,
    DOWN: 1,
    UP: 2,
    PRESSED: 3,
};

let App = require('./app'),
    THREE = require('three');

function mouseEventToButton(event) {
    return event.which || event.button;
}

function mouseEventToXY(canvas, event) {
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

    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    // Account window scrolling via scrollbars.
    x += window.pageXOffset;
    y += window.pageYOffset;

    // Flip y coordinate so that y = 0 is bottom.
    y = canvas.height - y - 1;

    return {
        x: x,
        y: y
    };
}

module.exports = function() {
    let self = {
        /**
         * Mouse button indices.
         */
        MouseButton: {
            LEFT: 1,
            RIGHT: 2,
            MIDDLE: 3,
        }
    };

    self.start = function() {
        document.addEventListener('keydown', _onKeyDown, false);
        document.addEventListener('keyup', _onKeyUp, false);
        self._keyStates = [];

        let canvas = App.canvas;
        canvas.addEventListener('mousedown', _onCanvasMouseDown, false);
        canvas.addEventListener('mouseup', _onCanvasMouseUp, false);
        canvas.addEventListener('mousemove', _onCanvasMouseMove, false);

        self._mouseButtonStates = [];
        self._mousePosition = new THREE.Vector2();
    };

    function _onKeyDown(event) {
        // Event will be repeatedly called when key held down, so we
        // need to guard against this by checking the current state.
        if (self._keyStates[event.keyCode] !== InputState.PRESSED) {
            self._keyStates[event.keyCode] = InputState.DOWN;
        }
    }

    function _onKeyUp(event) {
        self._keyStates[event.keyCode] = InputState.UP;
    }

    function _onCanvasMouseDown(event) {
        event.preventDefault();

        let button = mouseEventToButton(event);
        self._mouseButtonStates[button] = InputState.DOWN;
    }

    function _onCanvasMouseUp(event) {
        event.preventDefault();

        let button = mouseEventToButton(event);
        self._mouseButtonStates[button] = InputState.UP;
    }

    function _onCanvasMouseMove(event) {
        event.preventDefault();

        let mousePos = mouseEventToXY(App.canvas, event);
        self._mousePosition.set(mousePos.x, mousePos.y);
    }

    function _updateInputStates() {
        // Mouse states.
        for (let i in self._mouseButtonStates) {
            switch (self._mouseButtonStates[i]) {
                case InputState.DOWN:
                    self._mouseButtonStates[i] = InputState.PRESSED;
                    break;
                case InputState.UP:
                    self._mouseButtonStates[i] = InputState.NONE;
                    break;
            }
        }

        // Key states.
        for (let i in self._keyStates) {
            switch (self._keyStates[i]) {
                case InputState.DOWN:
                    self._keyStates[i] = InputState.PRESSED;
                    break;
                case InputState.UP:
                    self._keyStates[i] = InputState.NONE;
                    break;
            }
        }
    }

    self.update = function() {
        _updateInputStates();
    };

    /**
     * Was the key pushed down self frame?
     */
    self.isKeyDown = function(keyCode) {
        return self._keyStates[keyCode] === InputState.DOWN;
    };

    /**
     * Was the key released self frame?
     */
    self.isKeyUp = function(keyCode) {
        return self._keyStates[keyCode] === InputState.UP;
    };

    /**
     * Is the key pressed down?
     */
    self.isKeyPressed = function(keyCode) {
        return self._keyStates[keyCode] === InputState.PRESSED;
    };

    /**
     * Was the mouse button pushed down this frame?
     */
    self.isMouseButtonDown = function(buttonIndex) {
        return self._mouseButtonStates[buttonIndex] === InputState.DOWN;
    };

    /**
     * Was the mouse button lifted up this frame?
     */
    self.isMouseButtonUp = function(buttonIndex) {
        return self._mouseButtonStates[buttonIndex] === InputState.UP;
    };

    /**
     * Is the mouse button pressed down?
     */
    self.isMouseButtonPressed = function(buttonIndex) {
        return self._mouseButtonStates[buttonIndex] === InputState.PRESSED;
    };

    /**
     * Return the mouse 2D position.
     */
    self.getMousePosition = function() {
        return self._mousePosition;
    };

    return self;
};
