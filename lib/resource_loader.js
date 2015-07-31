'use strict';

let FileMgr = require('./core/file_mgr'),
    FramePacker = require('./core/frame_packer'),
    SpriteMgr = require('./core/sprite_mgr'),
    MaterialMgr = require('./core/material_mgr'),
    assert = require('assert'),
    pathLib = require('path');

let LoadUnit = {
    COMMON: 0,
    LEVEL: 1
};

function appendArray(array0, array1) {
    array1.forEach(function(entry) {
        array0.push(entry);
    });
}

function decodeCEL(outFrames, spriteLUT, path) {
    let pal = FileMgr.getFile('levels/towndata/town.pal'); // TODO:

    let cel = FileMgr.getFile(path);
    let frames = cel.decodeFrames(pal);
    appendArray(outFrames, frames);

    spriteLUT.push({
        name: cel.name,
        frameCount: frames.length
    });
}

function decodeCL2(outFrames, spriteLUT, path) {
    let pal = FileMgr.getFile('levels/towndata/town.pal'); // TODO:

    let cl2 = FileMgr.getFile(path);
    let images = cl2.decodeFrames(pal);

    for (let i = 0; i < images.length; i++) {
        let frames = images[i];
        appendArray(outFrames, frames);

        let spriteName = cl2.name + '_' + i;

        spriteLUT.push({
            name: spriteName,
            frameCount: frames.length
        });
    }
}

function loadSprites(loadUnit, filePaths) {
    let frames = [];
    let spriteLUT = [];

    // Decode all frame data.
    for (let i = 0; i < filePaths.length; i++) {
        switch (pathLib.extname(filePaths[i])) {
            case '.cel':
                decodeCEL(frames, spriteLUT, filePaths[i]);
                break;
            case '.cl2':
                decodeCL2(frames, spriteLUT, filePaths[i]);
                break;
        }
    }

    // Pack all the frame data into compact texture atlases.
    let width = 1024;
    let height = 1024;
    let packedFrameInfo = FramePacker.pack(width, height, frames);

    // Generate textures.
    let colorBufferIndexToTextureIdLUT = [];
    let colorBuffers = packedFrameInfo.colorBuffers;
    for (let i = 0; i < colorBuffers.length; i++) {
        let textureId = MaterialMgr.loadTexture(loadUnit, colorBuffers[i]);
        colorBufferIndexToTextureIdLUT[i] = textureId;
    }

    // Register sprites.
    let count = 0;
    let frameInfos = packedFrameInfo.frameInfos;
    for (let i = 0; i < spriteLUT.length; i++) {
        let spriteInfo = spriteLUT[i];
        let spriteEntry = new Array(spriteInfo.frameCount);

        for (let j = 0; j < spriteEntry.length; j++) {
            let frameInfo = frameInfos[count++];

            spriteEntry[j] = {
                w: frameInfo.w,
                h: frameInfo.h,
                uvs: frameInfo.uvs,
                textureId: colorBufferIndexToTextureIdLUT[frameInfo.bufferIndex]
            };
        }

        SpriteMgr.registerSprite(loadUnit, spriteInfo.name, spriteEntry);
    }
}

function _loadCommon(onFinishedCallback) {
    console.log('Loading common data...');

    let filePaths = [
        'levels/towndata/town.pal',
        //'plrgfx/warrior/wls/wlsst.cl2',
        //'plrgfx/warrior/wls/wlswl.cl2',
        'plrgfx/warrior/wls/wlsas.cl2',
        'plrgfx/warrior/wls/wlsaw.cl2',
        'plrgfx/warrior/wls/wlsat.cl2'
    ];

    let loadUnit = LoadUnit.COMMON;
    FileMgr.loadFiles(loadUnit, filePaths, function() {
        loadSprites(loadUnit, filePaths);

        onFinishedCallback();
    });
}

function doLoadLevel_0(onFinishedCallback) {
    let filePaths = [
        'levels/towndata/town.cel',
        'levels/towndata/town.min',
        'levels/towndata/town.til',
        'levels/towndata/town.sol',
        'levels/towndata/sector1s.dun',

        // 'towners/strytell/strytell.cel',
        //
        // 'objects/chest1.cel',
        //
        // 'monsters/falspear/phalln.cl2',
        // 'monsters/falspear/phalla.cl2',
        // 'monsters/falspear/phalld.cl2',
        // 'monsters/falspear/phallw.cl2',
        // 'monsters/falspear/phallh.cl2',
    ];

    let loadUnit = LoadUnit.LEVEL;
    FileMgr.loadFiles(loadUnit, filePaths, function() {
        loadSprites(loadUnit, filePaths);

        onFinishedCallback();
    });
}

let activeLevelIndex = null;

function _loadLevel(levelIndex, onFinishedCallback) {
    assert(activeLevelIndex === null, 'Level is already loaded: ' + activeLevelIndex);

    console.log('Loading level [' + levelIndex + '] data...');
    activeLevelIndex = levelIndex;

    switch (levelIndex) {
        case 0:
            doLoadLevel_0(onFinishedCallback);
            break;
        default:
            console.error('Unhandled level index: ' + levelIndex);
            break;
    }
}

function doUnload(loadUnit) {
    MaterialMgr.unloadTextures(loadUnit);
    SpriteMgr.unloadSprites(loadUnit);
    FileMgr.unloadFiles(loadUnit);
}

function _unloadCommon() {
    console.log('Unloading common data...');

    doUnload(LoadUnit.COMMON);
}

function _unloadActiveLevel() {
    assert(activeLevelIndex !== null);

    console.log('Unloading level [' + activeLevelIndex + '] data...');

    doUnload(LoadUnit.LEVEL);
    activeLevelIndex = null;
}

module.exports = {
    loadCommon: _loadCommon,
    unloadCommon: _unloadCommon,

    loadLevel: _loadLevel,
    unloadActiveLevel: _unloadActiveLevel
};
