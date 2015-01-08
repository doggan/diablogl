'use strict';

var MaterialMgr = require('./core/material_mgr');

var BLOCK_HEIGHT = 32;
var BLOCK_WIDTH = 32;
var HALF_BLOCK_HEIGHT = BLOCK_HEIGHT / 2;

var PILLAR_BLOCK_OFFSETS = new Array(16);
// Left side.
PILLAR_BLOCK_OFFSETS[0]  = { x: 0, y: BLOCK_HEIGHT * 7 };
PILLAR_BLOCK_OFFSETS[2]  = { x: 0, y: BLOCK_HEIGHT * 6 };
PILLAR_BLOCK_OFFSETS[4]  = { x: 0, y: BLOCK_HEIGHT * 5 };
PILLAR_BLOCK_OFFSETS[6]  = { x: 0, y: BLOCK_HEIGHT * 4 };
PILLAR_BLOCK_OFFSETS[8]  = { x: 0, y: BLOCK_HEIGHT * 3 };
PILLAR_BLOCK_OFFSETS[10] = { x: 0, y: BLOCK_HEIGHT * 2 };
PILLAR_BLOCK_OFFSETS[12] = { x: 0, y: BLOCK_HEIGHT * 1 };
PILLAR_BLOCK_OFFSETS[14] = { x: 0, y: BLOCK_HEIGHT * 0 };
// Right side.
PILLAR_BLOCK_OFFSETS[1]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 7 };
PILLAR_BLOCK_OFFSETS[3]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 6 };
PILLAR_BLOCK_OFFSETS[5]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 5 };
PILLAR_BLOCK_OFFSETS[7]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 4 };
PILLAR_BLOCK_OFFSETS[9]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 3 };
PILLAR_BLOCK_OFFSETS[11] = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 2 };
PILLAR_BLOCK_OFFSETS[13] = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 1 };
PILLAR_BLOCK_OFFSETS[15] = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 0 };

function getPillarOffset(col, row) {
    // Offset by 1/2 a pillar (one block) to center map.
    // Offset left by 1/2 a pillar (one block) for every row.
    // Offset right by 1/2 a pillar (one block) for every column.
    var x = -BLOCK_WIDTH - (row * BLOCK_WIDTH) + (col * BLOCK_WIDTH);
    // Offset downward by one block to put the origin at the top corner.
    // Offset downward by half a block for each column and row.
    var y = -BLOCK_HEIGHT + -(col * HALF_BLOCK_HEIGHT + row * HALF_BLOCK_HEIGHT);

    return [x, y];
}

function drawPillarSide(pillarBlocks, blockStartIndex, xOffset, yOffset, zCoord) {
    // TODO: cleanup this moveUp/isFirst logic.
    var moveUp = false;
    var isFirst = true;
    for (var i = blockStartIndex; i >= 0; i -= 2) {
        var block = pillarBlocks[i];
        if (block) {
            switch (block.type) {
            case 4: case 5:
                // If a block in a pillar section is one of these types, the block
                // and all blocks above it in the same pillar section should move up too.
                moveUp = true;
                break;
            default:
                if (isFirst) {
                    if (block.type === 1) {
                        // If the first block in a section is of this type, the
                        // entire section of blocks should move up.
                        moveUp = true;
                    } else {
                        moveUp = false;
                    }
                }
            }

            isFirst = false;
            var rect = PILLAR_BLOCK_OFFSETS[i];
            var extraYOffset = moveUp ? 1 : 0;

            var tileInfo = tilesetInfos[block.frameNum];
            var geometry = textureIdToGeometryLUT[tileInfo.textureId];

            // Create a new geometry if necessary.
            if (!geometry) {
                geometry = new THREE.Geometry();
                geometry.faceVertexUvs = [[]];
                geometries.push(geometry);

                var material = MaterialMgr.getBasicMaterial(tileInfo.textureId);
                materials.push(material);

                textureIdToGeometryLUT[tileInfo.textureId] = geometry;
            }

            var vertOffset = geometry.vertices.length;

            // TODO: tileInfo has a w/h property that can be used to dynamically dimensions

            // Vertices (bottom left, bottom right, top right, top left).
            geometry.vertices.push(new THREE.Vector3(xOffset + rect.x, yOffset + rect.y + extraYOffset, zCoord));
            geometry.vertices.push(new THREE.Vector3(xOffset + rect.x + BLOCK_WIDTH, yOffset + rect.y + extraYOffset, zCoord));
            geometry.vertices.push(new THREE.Vector3(xOffset + rect.x + BLOCK_WIDTH, yOffset + rect.y + extraYOffset + BLOCK_HEIGHT, zCoord));
            geometry.vertices.push(new THREE.Vector3(xOffset + rect.x, yOffset + rect.y + extraYOffset + BLOCK_HEIGHT, zCoord));

            // Faces.
            geometry.faces.push(new THREE.Face3(vertOffset + 0, vertOffset + 1, vertOffset + 3));
            geometry.faces.push(new THREE.Face3(vertOffset + 1, vertOffset + 2, vertOffset + 3));

            // UVs.
            var uvs = tileInfo.uvs;
            geometry.faceVertexUvs[0].push([
                uvs[1], uvs[2], uvs[0]
            ]);
            geometry.faceVertexUvs[0].push([
                uvs[2], uvs[3], uvs[0]
            ]);
        } else {
            isFirst = true;
        }
    }
}

function drawPillar(pillarBlocks, xOffset, yOffset, zCoord) {
    // Left side of pillar.
    drawPillarSide(pillarBlocks, pillarBlocks.length - 2, xOffset, yOffset, zCoord);
    // Right side of pillar.
    drawPillarSide(pillarBlocks, pillarBlocks.length - 1, xOffset, yOffset, zCoord);
}

// TODO: storing here for easy access. Should just be passed as parameters.
var geometries = [];
var materials = [];
var tilesetInfos;
var textureIdToGeometryLUT = [];

function _drawDungeon(dunFile, tilFile, minFile, scene) {
    geometries = [];
    materials = [];
    textureIdToGeometryLUT = [];

    var SpriteMgr = require('./core/sprite_mgr');
    tilesetInfos = SpriteMgr.getSprite('town');

    dunFile.unpack(tilFile);

    for (var row = 0; row < dunFile.rowCount; row++) {
        for (var col = 0; col < dunFile.colCount; col++) {
            var pillarIndex = dunFile.pillarData[col][row];
            if (pillarIndex !== null) {
                var offset = getPillarOffset(col, row);

                // Rendering from back to front, so we want a z-configuration like below.
                // We could also increase the zCoordinate for every rendered cell, but
                // that requires too much depth buffer precision. Also, an advantage to
                // the technique below is that we can partially render any pillar at
                // the correct z value without re-rendering any surrounding pillars.
                //
                //     /\     0
                //    /\/\  1   2
                //    \/\/    2
                //     \/
                var zCoord = col + row;

                drawPillar(minFile.pillars[pillarIndex], offset[0], offset[1], zCoord);
            }
        }
    }

    // console.log('Geometry count: ' + geometries.length);

    // Add all geometries to scene.
    for (var i = 0; i < geometries.length; i++) {
        var geometry = geometries[i];
        geometry.computeBoundingSphere();
        scene.add(new THREE.Mesh(geometry, materials[i]));
    }
}

module.exports = {
    drawDungeon: _drawDungeon
};
