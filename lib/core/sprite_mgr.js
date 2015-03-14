'use strict';

var loadedSprites = {};
var loadedSpriteInfos = {};

function _registerSprite(loadUnit, name, sprite) {
    // Duplicate check.
    if (loadedSprites[name]) {
        console.warn('Sprite already registered: ' + name);
        return;
    }

    loadedSprites[name] = sprite;
    loadedSpriteInfos[name] = {
        loadUnit: loadUnit
    };
}

function _unloadSprites(loadUnit) {
    // Gather list of sprites to delete.
    var unloadNames = [];
    for (var key in loadedSpriteInfos) {
        var info = loadedSpriteInfos[key];
        if (info.loadUnit === loadUnit) {
            unloadNames.push(key);
        }
    }

    // Perform deletion.
    for (var i = 0; i < unloadNames.length; i++) {
        var name = unloadNames[i];
        delete loadedSprites[name];
        delete loadedSpriteInfos[name];
    }
}

function _getSprite(name) {
    return loadedSprites[name];
}

module.exports = {
    registerSprite: _registerSprite,
    unloadSprites: _unloadSprites,
    getSprite: _getSprite
};
