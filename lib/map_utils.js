'use strict';

let tmx = require('tmx-parser'),
    findIndex = require('lodash.findindex');

/**
 * A class for encapsulating map data and common map operations.
 */
class TiledMap {
    constructor(map) {
        this._map = map;
    }
    
    get width() { return this._map.width; }
    get height() { return this._map.height; }
    
    get tileWidth() { return this._map.tileWidth; }
    get tileHeight() { return this._map.tileHeight; }
    
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
        } else {
            return index;
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
        let tileIndex = x * this.height + y;
        let tile = layer.tiles[tileIndex];
        
        // Empty tile.
        if (!tile) {
            return null;
        }
        
        return {
            tilesetIndex: this.getTilesetIndexForGid(tile.gid),
            tileGid: tile.gid,
            tileId: tile.id
        };
    }
    
    /**
     * Convert a tile position [x, y] to a world position [x, y].
     * @param  {number[]} tilePos The tile grid position.
     * @return {number[]}         The world position.
     */
    tileToWorldPos(tilePos) {
        let x = tilePos[0]; let y = tilePos[1];
        let tw = this.tileWidth; let th = this.tileHeight;
        return [(x * (tw / 2)) - (y * (tw / 2)),
                (th / 2) + (x * (th / 2)) + (y * (th / 2))];
    }
}

function createMap(game, map_name, cb) {
    let map_data = game.cache.getXML(map_name);
    if (!map_data) {
        return cb(new Error('Map not found in cache: ' + map_name));
    }
    let serializer = new XMLSerializer();
    let map_str = serializer.serializeToString(map_data);
    tmx.parse(map_str, '', function(err, tmx_map) {
        let tiled_map = new TiledMap(tmx_map);
        cb(err, tiled_map);
    });
}

exports.createMap = createMap;
exports.TiledMap = TiledMap;
