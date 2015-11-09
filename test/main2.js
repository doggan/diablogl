'use strict';

let ResourceMgr = require('./../lib/resource_mgr'),
    FramePacker = require('./../lib/core/frame_packer'),
    testUtil = require('./util'),
    PNG = require('node-png').PNG,
    fs = require('graceful-fs');

function loadData(onFinished) {
    console.log('Loading persistent data...');
    ResourceMgr.loadPersistentData(function() {
        unpackPersistentData();

        console.log('Loading level data...');
        ResourceMgr.loadLevelData(0, function() {
            unpackTownData();
            // ResourceMgr.unloadLevelData();
            // ResourceMgr.unloadPersistentData();

            onFinished();
        });
    });
}

function unpackPersistentData() {
    // body...
}

function unpackTownData() {
    // body...
}

function done() {
    function prepareAnimImpl(pal, cl2Path, decodedFrameLists) {
        let cl2 = ResourceMgr.getFile(cl2Path);
        let decodedImages = cl2.decodeFrames(pal);

        decodedFrameLists.push(decodedImages[0]);
        let lastIndex = decodedFrameLists.length - 1;

        // Store some basic meta info in properties of first animation
        // in this series. Allows for easy retrieval during later parsing.
        decodedFrameLists[lastIndex].baseAnimName = cl2.name;
        decodedFrameLists[lastIndex].imageCount = decodedImages.length;

        for (let i = 1; i < decodedImages.length; i++) {
            decodedFrameLists.push(decodedImages[i]);
        }
    }

    function parseTileset(packedFrameInfo, decodedFrameLists, colorBufferIndexToTextureIdLUT, startListOffset, level, animData) {
        let decodedFrames = decodedFrameLists[startListOffset];
        let frameListOffsetIndex = packedFrameInfo.frameListToIndexOffsetLUT[startListOffset];

        for (let i = 0; i < decodedFrames.length; i++) {
            let index = frameListOffsetIndex + i;
            let bufferIndex = packedFrameInfo.indexToBufferIndexLUT[index];

            level.tilesetInfos[i] = {
                textureId: colorBufferIndexToTextureIdLUT[bufferIndex],
                uvs: packedFrameInfo.uvs[index]
            };
        }

        return startListOffset + 1;
    }

    function parseAnim(packedFrameInfo, decodedFrameLists, colorBufferIndexToTextureIdLUT, startListOffset, level, animData) {
        let baseAnimName = decodedFrameLists[startListOffset].baseAnimName;
        let imageCount = decodedFrameLists[startListOffset].imageCount;

        let endOffset = startListOffset + imageCount;
        let animCount = 0;
        for (let i = startListOffset; i < endOffset; i++) {
            let frameListOffsetIndex = packedFrameInfo.frameListToIndexOffsetLUT[i];
            let decodedFrames = decodedFrameLists[i];

            let frameCount = decodedFrames.length;
            let uvs = new Array(frameCount);
            let textureIds = new Array(frameCount);
            for (let j = 0; j < frameCount; j++) {
                let index = frameListOffsetIndex + j;
                uvs[j] = packedFrameInfo.uvs[index];
                textureIds[j] = colorBufferIndexToTextureIdLUT[packedFrameInfo.indexToBufferIndexLUT[index]];
            }

            // Animation naming convention:
            // phalln_0, phalln_1, ..., phalln_7
            let animName = baseAnimName + '_' + animCount;
            animData[animName] = {
                frameCount: frameCount,
                textureIds: textureIds,
                uvs: uvs
            };

            animCount++;
        }

        return endOffset;
    }

    function doLoadStartup(decodedFrameLists, parsers) {
        function prepare_player(decodedFrameLists, parsers) {
            let pal = ResourceMgr.getFile('levels/towndata/town.pal');
            prepareAnimImpl(pal, 'plrgfx/warrior/wls/wlsas.cl2', decodedFrameLists);
            prepareAnimImpl(pal, 'plrgfx/warrior/wls/wlsaw.cl2', decodedFrameLists);
            prepareAnimImpl(pal, 'plrgfx/warrior/wls/wlsat.cl2', decodedFrameLists);
            parsers.push(parseAnim, parseAnim, parseAnim);
        }

        prepare_player(decodedFrameLists, parsers);
    }

    function doLoadLevel_0(decodedFrameLists, parsers) {
        function prepare_town(decodedFrameLists, parsers) {
            let pal = ResourceMgr.getFile('levels/towndata/town.pal');
            let cel = ResourceMgr.getFile('levels/towndata/town.cel');
            decodedFrameLists.push(cel.decodeFrames(pal));
            parsers.push(parseTileset);
        }

        function prepare_falspear(decodedFrameLists, parsers) {
            let pal = ResourceMgr.getFile('levels/towndata/town.pal');
            prepareAnimImpl(pal, 'monsters/falspear/phalla.cl2', decodedFrameLists);
            prepareAnimImpl(pal, 'monsters/falspear/phalln.cl2', decodedFrameLists);
            prepareAnimImpl(pal, 'monsters/falspear/phalld.cl2', decodedFrameLists);
            parsers.push(parseAnim, parseAnim, parseAnim);
        }

        prepare_town(decodedFrameLists, parsers);
        prepare_falspear(decodedFrameLists, parsers);
    }

    let decodedFrameLists = [];
    let parsers = [];
    doLoadLevel_0(decodedFrameLists, parsers);

    // let pal = ResourceMgr.getFile('levels/towndata/town.pal');
    // let cel = ResourceMgr.getFile('levels/towndata/town.cel');
    // let decodedFrames = cel.decodeFrames(pal);
    // decodedFrameLists.push(decodedFrames);

    let width = 1024;
    let height = 1024;
    let packedFrameInfo = FramePacker.pack(width, height, decodedFrameLists);

    for (let i = 0; i < packedFrameInfo.colorBuffers.length; i++) {
        let colorBuffer = packedFrameInfo.colorBuffers[i];

        let png = new PNG({
            width: colorBuffer.width,
            height: colorBuffer.height,
            filterType: -1
        });

        // Copy texture to png.
        for (let j = 0; j < colorBuffer.length; j++) {
            png.data[j] = colorBuffer[j];
        }

        let path = './test/textures/packedData/atlas' + i + '.png';
        console.log('Writing: ' + path + ', ' + png.width + 'x' + png.height);
        png.pack().pipe(fs.createWriteStream(path));
    }
}

function done2() {
    let pal = ResourceMgr.getFile('levels/towndata/town.pal');
    let cel = ResourceMgr.getFile('objects/chest1.cel');

    let frames = cel.decodeFrames(pal);
    for (let i = 0; i < frames.length; i++) {
        testUtil.writeCelFrameToPNG('./test/textures/frameData/chest1_' + i + '.png', frames[i]);
    }
}

// loadData(done);
loadData(done2);
