'use strict';

let Packer = require('./packer'),
    assert = require('assert'),
    THREE = require('three');

let Vector2 = THREE.Vector2;

let BYTES_PER_PIXEL = 4; // RGBA

/**
 * Attempts to pack and arrange all frame data efficiently onto fixed-size shared buffers.
 */
function createBufferInfos(maxWidth, maxHeight, decodedFrames, frameInfos, bufferInfos) {
    let currentBufferIndex = 0;
    let packer = new Packer(maxWidth, maxHeight);
    bufferInfos[currentBufferIndex].packer = packer;

    for (let i = 0; i < decodedFrames.length; i++) {
        let frame = decodedFrames[i];

        let frameInfo = frameInfos[i];
        frameInfo.w = frame.width;
        frameInfo.h = frame.height;

        let block = {
            w: frame.width,
            h: frame.height,
            frameIndex: i
        };

        // Attempt to pack the block into the current packer.
        if (!packer.fit(block)) {
            // No more room - pack failed! Create a new atlas.
            bufferInfos.push([]);
            currentBufferIndex++;

            packer = new Packer(maxWidth, maxHeight);
            bufferInfos[currentBufferIndex].packer = packer;

            // Attempt to fit into newly created packer.
            if (!packer.fit(block)) {
                console.error('Block does not fit into an empty packer: ' + block);

                // No owner atlas.
                frameInfo.bufferIndex = -1;
                continue;
            }
        }

        // Add to the current atlas.
        bufferInfos[currentBufferIndex].push(block);
        frameInfo.bufferIndex = currentBufferIndex;
    }
}

/**
 * Copy color buffer data from fromBuffer to a section of
 * toBuffer, designated by toX and toY offsets.
 */
function copyColorBuffer(fromBuffer, width, height, toBuffer, toX, toY, totalWidth) {
    let i = 0;
    let j = (toY * totalWidth + toX) * 4;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            toBuffer[j] = fromBuffer[i];
            toBuffer[j + 1] = fromBuffer[i + 1];
            toBuffer[j + 2] = fromBuffer[i + 2];
            toBuffer[j + 3] = fromBuffer[i + 3];

            i += 4;
            j += 4;
        }

        // Skip to the next row.
        j = ((toY + y + 1) * totalWidth + toX) * 4;
    }
}

/**
 * Allocate color buffers and copy all frame data over.
 */
function createBuffers(maxWidth, maxHeight, decodedFrames, bufferInfos, buffers) {
    let i, buffer;

    // Create color buffers.
    for (i = 0; i < bufferInfos.length; i++) {
        buffer = new Uint8Array(maxWidth * maxHeight * BYTES_PER_PIXEL);
        buffer.width = maxWidth;
        buffer.height = maxHeight;
        buffers[i] = buffer;
    }

    // Copy all frame color data to buffer.
    for (i = 0; i < bufferInfos.length; i++) {
        let blocks = bufferInfos[i];
        buffer = buffers[i];
        for (let j = 0; j < blocks.length; j++) {
            let block = blocks[j];
            let frame = decodedFrames[block.frameIndex];
            copyColorBuffer(
                frame.colors,
                block.w, block.h,
                buffer,
                block.x, block.y,
                maxWidth);
        }
    }
}

/**
 * Calculate UV coordinates for each frame given it's location within the buffer.
 */
function createUVs(frameInfos, bufferInfos, buffers) {
    for (let i = 0; i < bufferInfos.length; i++) {
        let blocks = bufferInfos[i];
        let buffer = buffers[i];
        let width = buffer.width;
        let height = buffer.height;

        for (let j = 0; j < blocks.length; j++) {
            let block = blocks[j];

            let uvs = new Array(4);
            // Top left.
            uvs[0] = new Vector2(block.x / width, (block.y + block.h) / height);
            // Bottom left.
            uvs[1] = new Vector2(block.x / width, block.y / height);
            // Bottom right.
            uvs[2] = new Vector2((block.x + block.w) / width, block.y / height);
            // Top right.
            uvs[3] = new Vector2((block.x + block.w) / width, (block.y + block.h) / height);

            frameInfos[block.frameIndex].uvs = uvs;
        }
    }
}

/**
 * Pack all frame data into compact atlases (color buffers).
 * Returns the packed color buffers, and a list of all the frame data
 * and their indices into the packed color buffers.
 * @param  {[number]} maxWidth  The maximum width of the generated color buffers.
 * @param  {[number]} maxHeight The maximum height of the generated color buffers.
 * @param  {[array]} decodedFrames    Decoded frame data packed into atlas.
 */
function _pack(maxWidth, maxHeight, decodedFrames) {
    // Allocate results.
    let frameInfos = new Array(decodedFrames.length);
    for (let i = 0; i < frameInfos.length; i++) {
        frameInfos[i] = {};
    }

    let bufferInfos = [
        []
    ];
    createBufferInfos(maxWidth, maxHeight, decodedFrames, frameInfos, bufferInfos);

    let buffers = new Array(bufferInfos.length);
    createBuffers(maxWidth, maxHeight, decodedFrames, bufferInfos, buffers);

    createUVs(frameInfos, bufferInfos, buffers);

    assert(frameInfos.length === decodedFrames.length);

    return {
        // Data for each frame.
        frameInfos: frameInfos,
        // Packed frame color buffers.
        colorBuffers: buffers
    };
}

module.exports = {
    pack: _pack
};
