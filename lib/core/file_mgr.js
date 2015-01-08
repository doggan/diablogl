'use strict';

var util = require('./../util'),
    async = require('async'),
    DFormats = require('diablo-file-formats'),
    pathLib = require('path');

function loadFileImpl(path, userCallback) {
    return function(asyncCallback) {
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) {
                console.error('Unable to load data file: ' + path);
                throw err;
            }

            userCallback(buffer);
            asyncCallback();
        });
    };
}

function createFileImpl(path, buffer) {
    switch (pathLib.extname(path)) {
        case '.pal':
            return DFormats.Pal.load(buffer, path);
        case '.cel':
            return DFormats.Cel.load(buffer, path);
        case '.cl2':
            return DFormats.Cl2.load(buffer, path);
        case '.min':
            return DFormats.Min.load(buffer, path);
        case '.til':
            return DFormats.Til.load(buffer, path);
        case '.sol':
            return DFormats.Sol.load(buffer, path);
        case '.dun':
            return DFormats.Dun.load(buffer, path);
        default:
            console.warn('Unhandled extension: ' + pathLib.extname(path));
    }

    return null;
}

function createFileLoader(loadUnit, path) {
    return loadFileImpl(path, function(buffer) {
        var file = createFileImpl(path, buffer);

        if (file) {
            // Duplicate check.
            if (loadedFiles[path]) {
                console.warn('File already loaded: ' + path);
                return;
            }

            loadedFiles[path] = file;
            loadedFileInfos[path] = { loadUnit: loadUnit };
        } else {
            console.warn('Unable to load file: ' + path);
        }
    });
}

var loadedFiles = {};
var loadedFileInfos = {};

/**
 * Loads a list of files into the specific load unit.
 */
function _loadFiles(loadUnit, paths, onFinishedCallback) {
    var fileLoaderWork = new Array(paths.length);
    for (var i = 0; i < paths.length; i++) {
        fileLoaderWork[i] = createFileLoader(loadUnit, paths[i]);
    }

    async.series(fileLoaderWork, function() {
        onFinishedCallback();
    });
}

/**
 * Unloads files for a given load unit.
 */
function _unloadFiles(loadUnit) {
    // Gather list of paths to delete.
    var unloadPaths = [];
    for (var key in loadedFileInfos) {
        var info = loadedFileInfos[key];
        if (info.loadUnit === loadUnit) {
            unloadPaths.push(key);
        }
    }

    // Perform deletion.
    for (var i = 0; i < unloadPaths.length; i++) {
        var path = unloadPaths[i];
        delete loadedFiles[path];
        delete loadedFileInfos[path];
    }
}

/**
 * Unloads all files.
 */
function _unloadAllFiles() {
    loadedFiles = {};
    loadedFileInfos = {};
}

/**
 * Gets a file.
 */
function _getFile(fileName) {
    return loadedFiles[fileName];
}

module.exports = {
    loadFiles: _loadFiles,
    unloadFiles: _unloadFiles,
    unloadAllFiles: _unloadAllFiles,
    getFile: _getFile
};
