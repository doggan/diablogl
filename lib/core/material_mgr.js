'use strict';

let THREE = require('three');

var loadedTextures = [];
var loadedTextureInfos = [];

var basicMaterials = [];
var selectedTargetMaterials = [];
var selectedTargetMaterials2 = [];

/**
 * Creates a texture from a given color buffer and returns the textureId.
 */
function _loadTexture(loadUnit, colorBuffer) {
    var imageTexture = new THREE.DataTexture(
        colorBuffer,
        colorBuffer.width, colorBuffer.height,
        THREE.RGBAFormat, THREE.UnsignedByteType,
        THREE.UVMapping,
        THREE.ClampToEdgeWrapping,
        THREE.ClampToEdgeWrapping,

        // Linear filtering will cause seams in tiles, due mixing the color
        // of the texture with alpha color outside of the texture coordinates.
        THREE.NearestFilter
    );
    imageTexture.flipY = false;
    imageTexture.needsUpdate = true;

    // TODO: if we constantly load/unload textures, this will
    // pose a theoretic limit to the # of times we can do that.
    // A better implementation would set a MAX_TEXTURE limit, and treat
    // the array as a circular buffer. The texture id would be the
    // next free entry in the array.
    var textureId = loadedTextures.length;
    loadedTextures.push(imageTexture);
    loadedTextureInfos.push(loadUnit);

    return textureId;
}

/**
 * Unload all textures and all materials referencing this texture
 * in the given load unit.
 */
function _unloadTextures(loadUnit) {
    // Gather list of indices to delete.
    var unloadIndices = [];
    for (var i = 0; i < loadedTextureInfos.length; i++) {
        if (loadedTextureInfos[i] === loadUnit) {
            unloadIndices.push(i);
        }
    }

    // Perform deletion.
    // We can't actually delete the entries in the arrays
    // since that would invalidate all other entries.
    for (i = 0; i < unloadIndices.length; i++) {
        loadedTextures[i] = null;
        loadedTextureInfos[i] = null;
    }
}

/**
 * Get the basic material for the given textureId.
 */
function _getBasicMaterial(textureId) {
    var material = basicMaterials[textureId];

    // Return existing material.
    if (material) {
        return material;
    }

    var texture = loadedTextures[textureId];

    // Generate a new material.
    material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,

        // Prevent full transparent portions of the texture from writing to the z-buffer.
        alphaTest: 0.5
    });

    basicMaterials[textureId] = material;

    return material;
}

/**
 * Get the selected target material for the given textureId.
 */
function _getSelectedTargetMaterial(textureId) {
    var color = new THREE.Vector3(0.8, 0.3, 0.3);
    var material = selectedTargetMaterials[textureId];

    // Return existing material.
    if (material) {
        return material;
    }

    var texture = loadedTextures[textureId];

    // TODO: remove from HTML document
    var vertShader = document.getElementById('vertexShader').innerHTML;
    var fragShader = document.getElementById('fragmentShader').innerHTML;

    // TODO: instead of using uniform for border color, might be more efficient to use
    // vertex color buffer instead?

    // TODO: only allows 1 unit to be targeted?
    var uniforms = {
        texture1: {
            type: 't',
            value: texture
        },
        borderColor: {
            type: 'v3',
            value: color
        }
    };

    // Generate a new material.
    material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertShader,
        fragmentShader: fragShader
    });

    selectedTargetMaterials[textureId] = material;

    return material;
}

function _getSelectedTargetMaterial2(textureId) {
    var color = new THREE.Vector3(0.7, 0.7, 0.4);
    var material = selectedTargetMaterials2[textureId];

    // Return existing material.
    if (material) {
        return material;
    }

    var texture = loadedTextures[textureId];

    // TODO: remove from HTML document
    var vertShader = document.getElementById('vertexShader').innerHTML;
    var fragShader = document.getElementById('fragmentShader').innerHTML;

    // TODO: instead of using uniform for border color, might be more efficient to use
    // vertex color buffer instead?

    // TODO: only allows 1 unit to be targeted?
    var uniforms = {
        texture1: {
            type: 't',
            value: texture
        },
        borderColor: {
            type: 'v3',
            value: color
        }
    };

    // Generate a new material.
    material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertShader,
        fragmentShader: fragShader
    });

    selectedTargetMaterials2[textureId] = material;

    return material;
}

module.exports = {
    loadTexture: _loadTexture,
    unloadTextures: _unloadTextures,
    getBasicMaterial: _getBasicMaterial,
    getSelectedTargetMaterial: _getSelectedTargetMaterial,
    getSelectedTargetMaterial2: _getSelectedTargetMaterial2
};
