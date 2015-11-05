'use strict';

let tmx = require('tmx-parser'),
    findIndex = require('lodash.findindex');

class TiledMap {
    constructor(map) {
        this._map = map;
    }
    
    get width() { return this._map.width; }
    get height() { return this._map.height; }
    
    get tileWidth() { return this._map.tileWidth; }
    get tileHeight() { return this._map.tileHeight; }
    
    getLayerIndex(layerName) {
        return findIndex(this._map.layers, (layer) => {
            return layer.name == layerName;
        });
    }
    
    getTilesetIndexForGid(gid) {
        
    }
    
    getTileIndex(layerIndex, x, y) {
        let layer = this._map.layers[layerIndex];
        let tileIndex = x * this.height + y;
        let gid = layer.tiles[tileIndex].gid;
        return gid;
        // let tilesetIndex = this.getTilesetIndexForGid(gid);
    }
    
    gridToWorldCoord(gridPos) {
        let x = gridPos[0]; let y = gridPos[1];
        let tw = this.tileWidth; let th = this.tileHeight;
        return [(x * (tw / 2)) - (y * (tw / 2)),
                (th / 2) + (x * (th / 2)) + (y * (th / 2))];
    }
}

function createMap(game, map_name, cb) {
    let map_data = game.cache.getXML(map_name);
    let serializer = new XMLSerializer();
    let map_str = serializer.serializeToString(map_data);
    tmx.parse(map_str, '', function(err, tmx_map) {
        let tiled_map = new TiledMap(tmx_map);
        cb(err, tiled_map);
    });
}

exports.createMap = createMap;
exports.TiledMap = TiledMap;
