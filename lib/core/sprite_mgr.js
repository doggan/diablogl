'use strict';

let loadedSprites = {};
let loadedSpriteInfos = {};

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
    let unloadNames = [];
    for (let key in loadedSpriteInfos) {
        let info = loadedSpriteInfos[key];
        if (info.loadUnit === loadUnit) {
            unloadNames.push(key);
        }
    }

    // Perform deletion.
    for (let i = 0; i < unloadNames.length; i++) {
        let name = unloadNames[i];
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
