var DFormats = require('diablo-file-formats'),
    PNG = require('node-png').PNG,
    fs = require('graceful-fs');

var BLOCK_HEIGHT = 32;
var HALF_BLOCK_HEIGHT = BLOCK_HEIGHT / 2;
var BLOCK_WIDTH = 32;
var PILLAR_BLOCK_RECTS = new Array(16);
PILLAR_BLOCK_RECTS[0]  = { x: 0, y: BLOCK_HEIGHT * 0 };
PILLAR_BLOCK_RECTS[2]  = { x: 0, y: BLOCK_HEIGHT * 1 };
PILLAR_BLOCK_RECTS[4]  = { x: 0, y: BLOCK_HEIGHT * 2 };
PILLAR_BLOCK_RECTS[6]  = { x: 0, y: BLOCK_HEIGHT * 3 };
PILLAR_BLOCK_RECTS[8]  = { x: 0, y: BLOCK_HEIGHT * 4 };
PILLAR_BLOCK_RECTS[10] = { x: 0, y: BLOCK_HEIGHT * 5 };
PILLAR_BLOCK_RECTS[12] = { x: 0, y: BLOCK_HEIGHT * 6 };
PILLAR_BLOCK_RECTS[14] = { x: 0, y: BLOCK_HEIGHT * 7 };

PILLAR_BLOCK_RECTS[1]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 0 };
PILLAR_BLOCK_RECTS[3]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 1 };
PILLAR_BLOCK_RECTS[5]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 2 };
PILLAR_BLOCK_RECTS[7]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 3 };
PILLAR_BLOCK_RECTS[9]  = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 4 };
PILLAR_BLOCK_RECTS[11] = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 5 };
PILLAR_BLOCK_RECTS[13] = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 6 };
PILLAR_BLOCK_RECTS[15] = { x: BLOCK_WIDTH, y: BLOCK_HEIGHT * 7 };

function getPillarWidth() {
    return BLOCK_WIDTH * 2;
}

function getPillarHeight(pillarBlocks) {
    return BLOCK_HEIGHT * (pillarBlocks.length / 2);
}

function getPillarOffset(col, row, mapWidth) {
    // From the center of the map, offset by 1/2 a pillar (one block).
    // Offset left by 1/2 a pillar (one block) for every row.
    // Offset right by 1/2 a pillar (one block) for every column.
    var x = (mapWidth / 2) - BLOCK_WIDTH - (row * BLOCK_WIDTH) + (col * BLOCK_WIDTH);
    // From the top of the map (y = 0), offset downward for each column and row.
    var y = (col * HALF_BLOCK_HEIGHT) + (row * HALF_BLOCK_HEIGHT);

    return [x, y];
}

function doPillarSide(pillarBlocks, blockStartIndex, celFrames, xOffset, yOffset, png) {
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
            var rect = PILLAR_BLOCK_RECTS[i];
            var extraYOffset = moveUp ? -1 : 0;

            var frame = celFrames[block.frameNum];

            drawToPNG(png,
                xOffset + rect.x, yOffset + rect.y + extraYOffset,
                BLOCK_WIDTH, BLOCK_HEIGHT,
                frame.colors,
                true);
        } else {
            isFirst = true;
        }
    }
}

function doPillar(pillarBlocks, celFrames, xOffset, yOffset, png) {
    // Left side of pillar.
    doPillarSide(pillarBlocks, pillarBlocks.length - 2, celFrames, xOffset, yOffset, png);
    // Right side of pillar.
    doPillarSide(pillarBlocks, pillarBlocks.length - 1, celFrames, xOffset, yOffset, png);
}

function doSquare(square, minFile, celFrames, pillarWidth, png) {
    var mapWidth = pillarWidth * 2;
    var offset = getPillarOffset(0, 0, mapWidth);
    doPillar(minFile.pillars[square[DFormats.Til.SQUARE_TOP]], celFrames, offset[0], offset[1], png);
    offset = getPillarOffset(1, 0, mapWidth);
    doPillar(minFile.pillars[square[DFormats.Til.SQUARE_RIGHT]], celFrames, offset[0], offset[1], png);
    offset = getPillarOffset(0, 1, mapWidth);
    doPillar(minFile.pillars[square[DFormats.Til.SQUARE_LEFT]], celFrames, offset[0], offset[1], png);
    offset = getPillarOffset(1, 1, mapWidth);
    doPillar(minFile.pillars[square[DFormats.Til.SQUARE_BOTTOM]], celFrames, offset[0], offset[1], png);
}

function doDungeon(dunFile, minFile, celFrames, width, png) {
    for (var row = 0; row < dunFile.rowCount; row++) {
        for (var col = 0; col < dunFile.colCount; col++) {
            var pillarIndex = dunFile.pillarData[col][row];
            if (pillarIndex !== null) {
                var offset = getPillarOffset(col, row, width);
                doPillar(minFile.pillars[pillarIndex], celFrames, offset[0], offset[1], png);
            }
        }
    }
}

function doLevel(level, minFile, celFrames, width, png) {
    for (var row = 0; row < level.rowCount; row++) {
        for (var col = 0; col < level.colCount; col++) {
            var dunIndex = level.dunMap[col][row];
            if (dunIndex !== null) {
                var dunFile = level.dunFiles[dunIndex];
                var localCol = col - dunFile.startCol;
                var localRow = row - dunFile.startRow;
                var pillarIndex = dunFile.pillarData[localCol][localRow];
                if (pillarIndex !== null) {
                    var offset = getPillarOffset(col, row, width);
                    doPillar(minFile.pillars[pillarIndex], celFrames, offset[0], offset[1], png);
                }
            }
        }
    }
}

function writeCelFrameToPNG(path, frame, skipFullAphaPixels) {
    var png = new PNG({
        width: frame.width,
        height: frame.height,
        filterType: -1
    });

    drawToPNG(png, 0, 0, frame.width, frame.height, frame.colors, skipFullAphaPixels);

    console.log('Writing: ' + path);
    png.pack().pipe(fs.createWriteStream(path));
}

function drawToPNG(png, startX, startY, width, height, colors, skipFullAphaPixels) {
    var totalWidth = png.width;
    var cnt = 0;
    for (var y = (startY + height - 1); y >= startY; y--) {
        for (var x = startX; x < (startX + width); x++) {
            var idx = (totalWidth * y + x) << 2;

            if (skipFullAphaPixels) {
                if (colors[cnt + 3] === 0) {
                    cnt += 4;

                    continue;
                }
            }

            png.data[idx] = colors[cnt];
            png.data[idx + 1] = colors[cnt + 1];
            png.data[idx + 2] = colors[cnt + 2];
            png.data[idx + 3] = colors[cnt + 3];
            cnt += 4;
        }
    }
}

module.exports = {
    getPillarWidth: getPillarWidth,
    getPillarHeight: getPillarHeight,
    doDungeon: doDungeon,
    doSquare: doSquare,
    writeCelFrameToPNG: writeCelFrameToPNG
};
