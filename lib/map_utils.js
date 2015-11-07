'use strict';

let tmx = require('tmx-parser'),
    findIndex = require('lodash.findindex'),
    forEach = require('lodash.foreach'),
    path = require('path');

/**
 * A class for encapsulating map data and common map operations.
 */
class TiledMap {
    constructor(map) {
        this._map = map;

        this._buildTilesets();
    }

    _buildTilesets() {
        this._tilesetAtlasNames = [];
        forEach(this._map.tileSets, (tileset) => {
            let imageName = tileset.image.source;
            let extension = path.extname(imageName);
            let atlasName = exports.atlasNamePrefix +
                path.basename(imageName, extension);
            this._tilesetAtlasNames.push(atlasName);
        });
    }

    get width() { return this._map.width; }
    get height() { return this._map.height; }

    get tileWidth() { return this._map.tileWidth; }
    get tileHeight() { return this._map.tileHeight; }

    get totalWidth() {
        let tw_2 = this.tileWidth / 2;
        return this.height * tw_2 + this.width * tw_2;
    }
    get totalHeight() {
        return Math.max(this.width, this.height) * this.tileHeight;
    }

    /**
     * Find the layer index for a given layer name.
     * @param  {string} layerName The layer name.
     * @return {number}           The index of the layer, or -1 if not found.
     */
    getLayerIndex(layerName) {
        return findIndex(this._map.layers, (layer) => {
            return layer.name == layerName;
        });
    }

    /**
     * Get the atlas name for a given tileset index.
     * @param {number} tilesetIndex The tileset index.
     * @return {string}             The atlas name, or undefined if not found.
     */
    getTilesetAtlasName(tilesetIndex) {
        return this._tilesetAtlasNames[tilesetIndex];
    }

    /**
     * Find the tileset index of a given tile gid.
     * @param {number} gid The tile global id.
     * @return {number}    The index of the tileset, of -1 if not found.
     */
    getTilesetIndexForGid(gid) {
        if (gid <= 0) {
            return -1;
        }

        if (this._map.tileSets.length === 0) {
            console.warn('No tilesets in map.');
            return -1;
        }

        let index = findIndex(this._map.tileSets, (tileset) => {
            return tileset.firstGid > gid;
        });

        // If not found, this gid is in the last tileset of the list.
        if (index === -1) {
            return this._map.tileSets.length - 1;
        }
        // Else the index was the previous tileset.
        else {
            return index - 1;
        }
    }

    /**
     * Get the tile information for a given x / y coordinate.
     * Returns null for empty tiles with no information.
     * @param  {number} layerIndex The layer index of this tile.
     * @param  {number} x          The tile x coordinate.
     * @param  {number} y          The tile y coordinate.
     * @return {object}            An object with the tile information.
     */
    getTileInfo(layerIndex, x, y) {
        let layer = this._map.layers[layerIndex];
        let tileIndex = y * this.width + x;
        let tile = layer.tiles[tileIndex];

        // Empty tile.
        if (!tile) {
            return null;
        }

        let tilesetIndex = this.getTilesetIndexForGid(tile.gid);
        let tileset = this._map.tileSets[tilesetIndex];

        return {
            tilesetIndex: tilesetIndex,
            tileGid: tile.gid,
            tileId: tile.id,
            tileWidth: tileset.tileWidth,
            tileHeight: tileset.tileHeight
        };
    }

    /**
     * Convert a tile position [x, y] to a world position [x, y].
     * The position will be at the top corner of the tile,
     * so that tile [0, 0] will return world position [0, 0].
     * @param  {number[]} tilePos The tile grid position.
     * @return {number[]}         The world position.
     */
    tileToWorldPos(tilePos) {
        let x = tilePos[0]; let y = tilePos[1];
        let tw_2 = this.tileWidth / 2; let th_2 = this.tileHeight / 2;
        return [(x * tw_2) - (y * tw_2),
                (x * th_2) + (y * th_2)];
    }

    /**
     * Convert a tile position [x, y] to a world position [x, y].
     * The position will be at the center of the tile.
     * @param  {number[]} tilePos The tile grid position.
     * @return {number[]}         The world position.
     */
    tileCenterToWorldPos(tilePos) {
        let worldPos = this.tileToWorldPos(tilePos);
        worldPos[1] += this.tileHeight / 2;
        return worldPos;
    }

    worldToTilePos(worldPos) {
        let x = worldPos[0] / this.tileWidth + worldPos[1] / this.tileHeight;
        let y = ((2 * worldPos[1]) / this.tileHeight) - x;
        return [Math.floor(x), Math.floor(y)];
    }
}

function preloadMap(game, key, url) {
    game.load.xml(key, url);
}

function createMap(game, key, cb) {
    let map_data = game.cache.getXML(key);
    if (!map_data) {
        return cb(new Error('Map not found in cache: ' + key));
    }
    let serializer = new XMLSerializer();
    let map_str = serializer.serializeToString(map_data);
    tmx.parse(map_str, '', function(err, tmx_map) {
        let tiled_map = new TiledMap(tmx_map);
        cb(err, tiled_map);
    });
}

/**
 * A prefix string appended to the name of each atlas.
 * Useful for setting the common atlas path for all atlas files.
 */
exports.atlasNamePrefix = '';

exports.preloadMap = preloadMap;
exports.createMap = createMap;
exports.TiledMap = TiledMap;
