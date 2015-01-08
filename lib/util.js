'use strict';

var http = require('http');

var SCHEME = 'http';
// TODO: external IP is not working from within network
var HOST = 'localhost';
// var HOST = '122.130.169.187';
var PORT = '3000';
var PATH_BASE = '/mpq_files/';

function _requestReadFile(fileName, cb) {
    console.log('Requesting file: ' + fileName);

    // Convert forward slashes to backward slashs.
    // MPQ files are stored with backward slashes (path\to\file.ext), but
    // we want to allow forward slash usage from application (path/to/file.ext)
    // in order to use all standard nodejs path implementations (Unix-style).
    fileName = fileName.replace(/\//g, '\\');

    var req = http.request({
        scheme: SCHEME,
        host: HOST,
        port: PORT,
        path : PATH_BASE + encodeURIComponent(fileName),
        method: 'GET',
        withCredentials: false,
        responseType: 'arraybuffer'
    }, function(res) {
        var data = [];
        res.on('data', function (buf) {
            data.push(buf);
        });

        res.on('end', function () {
            if (res.statusCode != 200) {
                return cb(new Error('HTTP request failed: ' + res.statusCode), res);
            }

            data = Buffer.concat(data);

            // From the browser, we are given a UInt8Array,
            // so we need to convert to a Buffer object.
            if (!Buffer.isBuffer(data)) {
                data = new Buffer(data);
            }

            cb(null, res, data);
        });
    });

    req.on('error', function(err) {
        cb(err, null);
    });

    req.end();
}

var TILE_WIDTH = 64;
var TILE_HEIGHT = 32;

/**
 * Convert screen coordinates to projection space coordinates (-1, +1).
 */
function _screenToProjectionCoord(screenWidth, screenHeight, screenPosX, screenPosY) {
    return {
        x: screenPosX / screenWidth * 2 - 1,
        y: screenPosY / screenHeight * 2 - 1
    };
}

/**
 * Convert screen coordinates to world coordinates.
 */
function _screenToWorldCoord(screenWidth, screenHeight, screenPos, camera, resultVec) {
    var projectPos = _screenToProjectionCoord(screenWidth, screenHeight, screenPos.x, screenPos.y);

    // TODO: eliminate this dependency?
    var projector = new THREE.Projector();
    var v = new THREE.Vector3(projectPos.x, projectPos.y, 0);
    projector.unprojectVector(v, camera);

    resultVec.set(v.x, v.y);
}

/**
 * Convert world to grid coordinate.
 */
function _worldToGridCoord(worldPos, resultVec) {
    var col = (worldPos.x / TILE_WIDTH) - (worldPos.y / TILE_HEIGHT);
    var row = ((-2 * worldPos.y) / TILE_HEIGHT) - col;

    // TODO: clamp to world boundaries?
    col = Math.min(Math.max(col, 0), 49);
    row = Math.min(Math.max(row, 0), 49);

    resultVec.set(Math.floor(col), Math.floor(row));
}

/**
 * Convert grid to world coordinates.
 */
function _gridToWorldCoord(gridPos, resultVec) {
    resultVec.set(
        (gridPos.x * (TILE_WIDTH / 2)) - (gridPos.y * (TILE_WIDTH / 2)),
        -(TILE_HEIGHT / 2) - (gridPos.x * (TILE_HEIGHT / 2)) - (gridPos.y * (TILE_HEIGHT / 2))
    );
}

/**
 * Gets the distance in grid coordinates between two grid positions.
 * Neighbor grid coordinates (in 8 directions) will have a distance of 1.
 * Reference:
 *  - http://en.wikipedia.org/wiki/Chebyshev_distance
 */
function _getGridDistance(fromGridPos, toGridPos) {
    var dx = Math.abs(fromGridPos.x - toGridPos.x);
    var dy = Math.abs(fromGridPos.y - toGridPos.y);
    return Math.max(dx, dy);
}

/**
 * Get the grid offset for 1 grid position in the facing direction.
 */
function _getGridOffsetInDirection(direction) {
    var result = new THREE.Vector2();

    switch (direction) {
        case 0:
            result.set(1, 1);
            break;
        case 1:
            result.set(0, 1);
            break;
        case 2:
            result.set(-1, 1);
            break;
        case 3:
            result.set(-1, 0);
            break;
        case 4:
            result.set(-1, -1);
            break;
        case 5:
            result.set(0, -1);
            break;
        case 6:
            result.set(1, -1);
            break;
        case 7:
            result.set(1, 0);
            break;
        default:
            console.warn('Unhandled facing direction: ' + direction);
            break;
    }

    return result;
}

function _getMoveSpeed(direction, xSpeed, ySpeed) {
    // For diagonal tiles, we adjust the speed to scale with the ratio of the tiles.
    // This helps maintain the 3D perspective illusion.
    var sum = TILE_WIDTH + TILE_HEIGHT;
    var xPercent = TILE_WIDTH / sum;
    var yPercent = TILE_HEIGHT / sum;
    var speed = (xSpeed * xPercent) + (ySpeed * yPercent);

    switch (direction) {
        case 0: return ySpeed;
        case 1: return speed;
        case 2: return xSpeed;
        case 3: return speed;
        case 4: return ySpeed;
        case 5: return speed;
        case 6: return xSpeed;
        case 7: return speed;
        default:
            console.warn('Unhandled direction: ' + direction);
            return xSpeed;
    }
}

function _getDirection(oldX, oldY, newX, newY) {
    var dx = newX - oldX;
    var dy = newY - oldY;

    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));

    if (dx === 0) {
        switch (dy) {
            case 1: return 1;
            case -1: return 5;
        }
    } else if (dx === 1) {
        switch (dy) {
            case 1: return 0;
            case 0: return 7;
            default: return 6;
        }
    } else {
        switch (dy) {
            case 1: return 2;
            case 0: return 3;
            default: return 4;
        }
    }

    // Failure - maintain current facing direction.
    return -1;
}

function _dbgDrawTile(col, row, colorStr, THREE, DbgDraw) {
    var centerPos = new THREE.Vector2();
    _gridToWorldCoord(new THREE.Vector2(col, row), centerPos);

    var z = 6000;
    var points = [
        // Top.
        new THREE.Vector3(
            centerPos.x,
            centerPos.y + (TILE_HEIGHT / 2),
            z),
        // Right.
        new THREE.Vector3(
            centerPos.x + (TILE_WIDTH / 2),
            centerPos.y,
            z),
        // Bottom.
        new THREE.Vector3(
            centerPos.x,
            centerPos.y - (TILE_HEIGHT / 2),
            z),
        // Left.
        new THREE.Vector3(
            centerPos.x - (TILE_WIDTH / 2),
            centerPos.y,
            z),
        // Top (connect back to top).
        new THREE.Vector3(
            centerPos.x,
            centerPos.y + TILE_HEIGHT / 2,
            z)
    ];

    DbgDraw.drawLineStrip(points, colorStr);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    requestReadFile: _requestReadFile,

    TILE_WIDTH: TILE_WIDTH,
    TILE_HEIGHT: TILE_HEIGHT,
    screenToProjectionCoord: _screenToProjectionCoord,
    screenToWorldCoord: _screenToWorldCoord,
    worldToGridCoord: _worldToGridCoord,
    gridToWorldCoord: _gridToWorldCoord,
    getGridDistance: _getGridDistance,
    getGridOffsetInDirection: _getGridOffsetInDirection,
    getMoveSpeed: _getMoveSpeed,
    getDirection: _getDirection,

    getRandomInt: getRandomInt,

    dbgDrawTile: _dbgDrawTile
};
