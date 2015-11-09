'use strict';

var PathFinding = require('pathfinding');

class LevelController {
    setup(game) {
        this._game = game;
    }

    get game() { return this._game; }
    get map() { return this._map; }

    tempLoad(map) {
        this._map = map;

        this._buildCollisionGrid();
    }

    _buildCollisionGrid() {
        let w = this._map.width; let h = this._map.height;
        this._collisionGridStatic = new PathFinding.Grid(w, h);
    }

    get collisionGrid() {
        return this._collisionGridStatic.clone();
    }

    // loadLevel() {
    //
    // }
}

// Singleton instance.
let levelController = new LevelController();

module.exports = function() {
    return levelController;
}();
