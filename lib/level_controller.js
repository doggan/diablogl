'use strict';

let util = require('./util');
let FileMgr = require('./core/file_mgr');
let THREE = require('three');

let enemies = [];
let players = [];
let localPlayer = null;

let activeBreadcrumbs = [];
let Vector2;
let DbgDraw;
let g_engine;

let BREADCRUMB_UNSPAWN_TIME = 5.0;

function init(engine) {
    g_engine = engine;
    engine.on('update', update);

    Vector2 = engine.THREE.Vector2;
    DbgDraw = require('three-debug-draw')(engine.THREE);
}

function update() {
    // Prune breadcrumbs.
    for (let i = 0; i < activeBreadcrumbs.length; /*i++*/ ) {
        if (activeBreadcrumbs[i].elapsedTime >= BREADCRUMB_UNSPAWN_TIME) {
            activeBreadcrumbs.splice(i, 1);
            continue;
        }

        i++;
    }

    // Advance all breadcrumbs forward in time.
    let deltaTime = g_engine.time.deltaTime;
    for (let i = 0; i < activeBreadcrumbs.length; i++) {
        activeBreadcrumbs[i].elapsedTime += deltaTime;
    }

    // debug draw:
    // for (i = 0; i < activeBreadcrumbs.length; i++) {
    //     let breadcrumb = activeBreadcrumbs[i];
    //     let pos = new Vector2();
    //
    //     util.gridToWorldCoord(breadcrumb.gridPosition, pos);
    //     pos.z = 1000;
    //
    //     DbgDraw.drawSphere(pos, 5.0, 'cyan');
    // }

    // let bc = getNewestBreadcrumb(0, new Vector2(2, 2));
    // if (bc) {
    //     let p = new Vector2();
    //     util.gridToWorldCoord(bc.gridPosition, p);
    //     p.z = 1000;
    //     DbgDraw.drawSphere(p, 8.0, 'magenta');
    // }
}

function addBreadcrumb(breadcrumb) {
    activeBreadcrumbs.push(breadcrumb);
    breadcrumb.elapsedTime = 0;
}

function clearBreadcrumbs(id) {
    for (let i = 0; i < activeBreadcrumbs.length; /*i++*/ ) {
        if (activeBreadcrumbs[i].id === id) {
            activeBreadcrumbs.splice(i, 1);
        } else {
            i++;
        }
    }
}

function getNewestBreadcrumb(id, fromGridPosition) {
    let newest = null;
    let newestTime = Number.MAX_VALUE;
    for (let i = 0; i < activeBreadcrumbs.length; i++) {
        if (activeBreadcrumbs[i].id === id) {
            // Newest is the one with least amount of elapsed time.
            if (activeBreadcrumbs[i].elapsedTime < newestTime) {
                // Also must be in LoS.
                if (checkLineOfSight(fromGridPosition, activeBreadcrumbs[i].gridPosition)) {
                    newest = activeBreadcrumbs[i];
                    newestTime = newest.elapsedTime;
                }
            }
        }
    }
    return newest;
}

function checkLineOfSight(fromGridPosition, toGridPosition, hitGridPosition) {
    // Origin point is a collision?
    // if (_checkCollision(fromGridPosition)) {
    //     hitGridPosition.copy(fromGridPosition);
    //     return false;
    // }

    let currentGridPosition = fromGridPosition.clone();
    while (true) {
        // We made it to the destination position without any collisions.
        if (currentGridPosition.equals(toGridPosition)) {
            return true;
        }

        // Go to the next cell along the direction.
        let direction = util.getDirection(currentGridPosition.x, currentGridPosition.y, toGridPosition.x, toGridPosition.y);
        let offset = util.getGridOffsetInDirection(direction);
        currentGridPosition.add(offset);

        // TODO: ignore destination cell collision (player)
        if (currentGridPosition.equals(toGridPosition)) {
            return true;
        }

        // Is there a collision at the next cell?
        if (_checkCollision(currentGridPosition)) {
            if (hitGridPosition) {
                hitGridPosition.copy(currentGridPosition);
            }
            return false;
        }
    }

    // No collisions.
    return true;
}

function getNearestPlayerInRange(fromGridPosition, maxRange) {
    let nearestPlayer = null;
    let nearestPlayerDist = Number.MAX_VALUE;
    for (let i = 0; i < players.length; i++) {
        let pos = players[i].getComponent('GameObjectComponent').currentGridPosition;
        let dx = Math.abs(fromGridPosition.x - pos.x);
        let dy = Math.abs(fromGridPosition.y - pos.y);
        let d = dx + dy;
        if (d < maxRange) {
            if (d < nearestPlayerDist) {
                nearestPlayer = players[i];
                nearestPlayerDist = d;
            }
        }
    }

    return nearestPlayer;
}

function _registerPlayer(player) {
    players.push(player);

    // TODO: for now, set first player as local.
    if (localPlayer === null) {
        localPlayer = player;
    }
}

function _getLocalPlayer() {
    return localPlayer;
}

function getPlayerAtGridPosition(gridPosition) {
    for (let i = 0; i < players.length; i++) {
        let gameObjectComponent = players[i].getComponent('GameObjectComponent');
        if (gridPosition.equals(gameObjectComponent.currentGridPosition)) {
            return players[i];
        }
    }

    return null;
}

function _registerEnemy(enemy) {
    enemies.push(enemy);
}

function TEMP_getEnemy() {
    if (enemies.length > 0)
        return enemies[0];

    return null;
}

function _getEnemy(gridPos) {
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];

        // TODO: shouldn't need to convert enemy world coordinate since it already has it's integer grid coordinate
        let enemyGridPos = new THREE.Vector2();
        util.worldToGridCoord(enemy.position, enemyGridPos);

        if (gridPos.equals(enemyGridPos)) {
            return enemy;
        }
    }

    return null;
}

function TEMP_getEnemies() {
    return enemies;
}

function _getNearestEnemyWorldPos(worldPos) {
    // TODO: how to handle overlapping targets? closest to camera (lowest y coord?)?
    let best = -1;
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        let goComponent = enemy.getComponent('GameObjectComponent');
        if (!goComponent.isTargetable) {
            continue;
        }

        let centerX = enemy.position.x + goComponent.collisionOffset.x;
        let centerY = enemy.position.y + goComponent.collisionOffset.y;
        let halfWidth = goComponent.collisionRect.x * 0.5;
        let halfHeight = goComponent.collisionRect.y * 0.5;
        let minX = centerX - halfWidth;
        let maxX = centerX + halfWidth;
        let minY = centerY - halfHeight;
        let maxY = centerY + halfHeight;

        if (worldPos.x >= minX && worldPos.x <= maxX &&
            worldPos.y >= minY && worldPos.y <= maxY) {
            best = i;
        }
    }

    if (best !== -1) {
        return enemies[best];
    }

    return null;
}

function _isCollisionTile(col, row) {
    // TODO:
    let dun = FileMgr.getFile('levels/towndata/sector1s.dun');
    let til = FileMgr.getFile('levels/towndata/town.til');
    let sol = FileMgr.getFile('levels/towndata/town.sol');

    // Temp.. before level is loaded, we might do a mouse over.
    if (!sol || !dun || !til) {
        return false;
    }

    // TODO:
    dun.unpack(til);

    let pillarIndex = dun.pillarData[col][row];
    return sol.isCollision(pillarIndex);
}

let PF = require('pathfinding');
let collisionGridStatic = null;
let collisionGridDynamic = null;

function _onLevelLoaded() {
    // TODO: town only for now
    let width = 50;
    let height = 50;

    collisionGridStatic = new PF.Grid(width, height);
    collisionGridDynamic = new PF.Grid(width, height);

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            if (_isCollisionTile(i, j)) {
                collisionGridStatic.setWalkableAt(i, j, false);
            }

            collisionGridDynamic.getNodeAt(i, j).count = 0;
        }
    }
}

function _getStaticCollisionGrid() {
    if (collisionGridStatic) {
        return collisionGridStatic.clone();
    }

    return null;
}

function _getDynamicCollisionGrid() {
    if (collisionGridDynamic) {
        return collisionGridDynamic.clone();
    }

    return null;
}

function _getCollisionGrid() {
    let grid = _getStaticCollisionGrid();
    if (grid) {
        let dynamicGrid = collisionGridDynamic;
        if (dynamicGrid) {
            for (let i = 0; i < grid.width; i++) {
                for (let j = 0; j < grid.height; j++) {
                    if (!dynamicGrid.isWalkableAt(i, j)) {
                        grid.setWalkableAt(i, j, false);
                    }
                }
            }
        }
    }

    return grid;
}

function _setDynamicCollision(gridPos) {
    let node = collisionGridDynamic.getNodeAt(gridPos.x, gridPos.y);
    node.count = node.count + 1;

    node.walkable = false;
}

function _unsetDynamicCollision(gridPos) {
    let node = collisionGridDynamic.getNodeAt(gridPos.x, gridPos.y);
    node.count = Math.max(node.count - 1, 0);

    if (node.count === 0) {
        node.walkable = true;
    }
}

function _checkStaticCollision(gridPos) {
    if (collisionGridStatic) {
        return !collisionGridStatic.isWalkableAt(gridPos.x, gridPos.y);
    } else {
        return false;
    }
}

function _checkDynamicCollision(gridPos) {
    if (collisionGridDynamic) {
        return !collisionGridDynamic.isWalkableAt(gridPos.x, gridPos.y);
    } else {
        return false;
    }
}

function _checkCollision(gridPos) {
    return _checkStaticCollision(gridPos) || _checkDynamicCollision(gridPos);
}

module.exports = {
    init: init,

    TEMP_setCurrentLevel: function() {
        _onLevelLoaded();
    },

    registerPlayer: _registerPlayer,
    getLocalPlayer: _getLocalPlayer,
    getPlayerAtGridPosition: getPlayerAtGridPosition,

    registerEnemy: _registerEnemy,
    getEnemy: _getEnemy,
    getNearestEnemyWorldPos: _getNearestEnemyWorldPos,

    getStaticCollisionGrid: _getStaticCollisionGrid,
    getDynamicCollisionGrid: _getDynamicCollisionGrid,
    getCollisionGrid: _getCollisionGrid,

    setDynamicCollision: _setDynamicCollision,
    unsetDynamicCollision: _unsetDynamicCollision,

    checkStaticCollision: _checkStaticCollision,
    checkDynamicCollision: _checkDynamicCollision,
    checkCollision: _checkCollision,

    addBreadcrumb: addBreadcrumb,
    clearBreadcrumbs: clearBreadcrumbs,
    getNewestBreadcrumb: getNewestBreadcrumb,

    checkLineOfSight: checkLineOfSight,

    getNearestPlayerInRange: getNearestPlayerInRange,

    TEMP_getEnemy: TEMP_getEnemy,
    TEMP_getEnemies: TEMP_getEnemies,
};
