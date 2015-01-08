'use strict';

var Game = require('./lib/game'),
    LevelController = require('./lib/level_controller'),
    ResourceLoader = require('./lib/resource_loader');

document.addEventListener("DOMContentLoaded", function() {
    var game = new Game({
        clearColor: 0xDEDEDE
    });

    var THREE = game.THREE;
    var util = require('./lib/util');
    var DbgDraw = require('three-debug-draw')(THREE);

    // Stat object initialization.
    var glS = new glStats();
    var tS = new threeStats(game.renderer);
    var rS = new rStats({
        CSSPath : "css/",
        values: {
            fps: { caption: 'Framerate (FPS)', below: 59 },
            frame: { caption: 'Total frame time (ms)', over: 16, average: true, avgMs: 100 },
            calls: { caption: 'Calls (three.js)', over: 3000 },
            rstats: { caption: 'rStats update (ms)', average: true, avgMs: 100 },

            limit: { caption: 'Limit (MB)' },
            used: { caption: 'Used (MB)' },
            total: { caption: 'Total (MB)' },
            remaining: { caption: 'Remaining (MB)' },
        },
        groups: [
            { caption: 'General', values: [ 'fps', 'frame', 'update', 'render', 'rstats' ] },
            { caption: 'Memory', values: [ 'limit', 'used', 'total', 'remaining' ] }
        ],
        plugins: [
            tS,
            glS
        ]
    });

    // Hide stats.
    document.getElementsByClassName('rs-base')[0].style.display = 'none';

    game.on('update', function() {
        rS('FPS').frame();
        rS('frame').start();
        glS.start();
        rS('update').start();

        // Dbg draw - LoS from enemy to player
        // var e = LevelController.TEMP_getEnemy();
        // if (e) {
        //     var p = LevelController.getLocalPlayer();
        //
        //     var p0 = e.getComponent('GameObjectComponent').currentGridPosition.clone();
        //     var p1 = p.getComponent('GameObjectComponent').currentGridPosition.clone();
        //
        //     var hitPos = new THREE.Vector2();
        //     var res = LevelController.checkLineOfSight(p0, p1, hitPos);
        //
        //     var c = 'cyan';
        //     if (res === false) {
        //         c = 'red';
        //     }
        //
        //     util.dbgDrawTile(p0.x, p0.y, c, THREE, DbgDraw);
        //
        //     while (true) {
        //         if ((res === false) && p0.equals(hitPos)) {
        //             break;
        //         }
        //
        //         var d = util.getDirection(p0.x, p0.y, p1.x, p1.y);
        //         var o = util.getGridOffsetInDirection(d);
        //         p0.x += o.x;
        //         p0.y += o.y;
        //
        //         util.dbgDrawTile(p0.x, p0.y, c, THREE, DbgDraw);
        //
        //         if (p0.equals(p1)) {
        //             break;
        //         }
        //     }
        // }

        {
            var mousePos = game.mousePosition;
            var gridPos = new THREE.Vector2();
            util.screenToWorldCoord(game.width, game.height, mousePos, game.camera, gridPos);
            util.worldToGridCoord(gridPos, gridPos);

            if (LevelController.checkStaticCollision(gridPos)) {
                // util.dbgDrawTile(gridPos.x, gridPos.y, 'red', THREE, DbgDraw);
            } else {
                util.dbgDrawTile(gridPos.x, gridPos.y, 'green', THREE, DbgDraw);
            }
        }

        // Draw all static collision tiles.
        // var staticCollisionGrid = LevelController.getStaticCollisionGrid();
        // if (staticCollisionGrid) {
        //     for (var j = 0; j < staticCollisionGrid.width; j++) {
        //         for (var i = 0; i < staticCollisionGrid.height; i++) {
        //             if (staticCollisionGrid.isWalkableAt(j, i)) {
        //                 util.dbgDrawTile(j, i, 'green', THREE, DbgDraw);
        //             } else {
        //                 util.dbgDrawTile(j, i, 'red', THREE, DbgDraw);
        //             }
        //         }
        //     }
        // }

        // Draw all dynamic collision tiles.
        // var dynamicCollisionGrid = LevelController.getDynamicCollisionGrid();
        // if (dynamicCollisionGrid) {
        //     for (var j = 0; j < dynamicCollisionGrid.width; j++) {
        //         for (var i = 0; i < dynamicCollisionGrid.height; i++) {
        //             if (dynamicCollisionGrid.isWalkableAt(j, i)) {
        //                 util.dbgDrawTile(j, i, 'green', THREE, DbgDraw);
        //             } else {
        //                 util.dbgDrawTile(j, i, 'red', THREE, DbgDraw);
        //             }
        //         }
        //     }
        // }

        if (LevelController.getLocalPlayer()) {
            var player = LevelController.getLocalPlayer();
            var actionComponent = player.getComponent('ActionComponent');
            if (actionComponent.currentPath !== null) {
                for (var i = 0; i < actionComponent.currentPath.length; i++) {
                    var col = actionComponent.currentPath[i][0];
                    var row = actionComponent.currentPath[i][1];
                    // util.dbgDrawTile(col, row, 'blue', THREE, DbgDraw);
                }
            }
        }
    });

    game.on('lateUpdate', function() {
        rS('update').end();
    });

    game.on('render', function() {
        rS('render').start();

        DbgDraw.render(game.scene);
    });

    game.on('frameEnd', function() {
        rS('render').end();
        rS('frame').end();

        rS('limit').set(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        rS('total').set(performance.memory.totalJSHeapSize / 1024 / 1024);
        rS('used').set(performance.memory.usedJSHeapSize / 1024 / 1024);
        rS('remaining').set((performance.memory.totalJSHeapSize - performance.memory.usedJSHeapSize) / 1024 / 1024);

        rS('rStats').start();
        rS().update();
        rS('rStats').end();
    });

    var bt = require('behavior-tree');
    bt.Services.deltaTime = function() {
        return game.time.deltaTime;
    };
    LevelController.init(game);

    game.run();

    ResourceLoader.loadCommon(function() {
        ResourceLoader.loadLevel(0, onLevelLoaded);
    });

    function onLevelLoaded() {
        LevelController.TEMP_setCurrentLevel();

        var FileMgr = require('./lib/core/file_mgr');
        var dun = FileMgr.getFile('levels/towndata/sector1s.dun');
        var til = FileMgr.getFile('levels/towndata/town.til');
        var min = FileMgr.getFile('levels/towndata/town.min');

        var renderer = require('./lib/level_renderer');
        renderer.drawDungeon(dun, til, min, game.scene);

        var NetworkMgr = require('./lib/network_mgr');
        game.networkMgr = new NetworkMgr();

        // Network test code...
        game.networkMgr.on('connect', function(didSucceed, sessionId) {
            var player;

            if (didSucceed) {
                console.log('ON CONNECT: succeeded! sessionId: ' + sessionId);

                player = _TEMP_setupPlayer(new THREE.Vector2(0, 0), true);
                var networkComponent = player.getComponent('NetworkComponent');
                networkComponent.objectId = sessionId;    // TODO: object id generation; for now just use session id for player
                networkComponent.ownerId = sessionId;
            } else {
                console.log('ON CONNECT: failed!');

                player = _TEMP_setupPlayer(new THREE.Vector2(11, 24), true);

                // _TEMP_setupHealer(new THREE.Vector2(4, 4));
                // _TEMP_setupObject(new THREE.Vector2(8, 3));

                // Enemy.
                _TEMP_setupEnemy(new THREE.Vector2(14, 21));
                // _TEMP_setupEnemy(new THREE.Vector2(3, 2));
                // _TEMP_setupEnemy(new THREE.Vector2(4, 2));
                // _TEMP_setupEnemy(new THREE.Vector2(5, 2));
                // _TEMP_setupEnemy(new THREE.Vector2(6, 2));
                // _TEMP_setupEnemy(new THREE.Vector2(3, 3));
                // _TEMP_setupEnemy(new THREE.Vector2(4, 4));
            }
        });

        game.networkMgr.on('disconnect', function() {
            console.log('ON DISCONNECT');
        });

        game.networkMgr.on('playerJoined', function(data) {
            console.log('ON PLAYER JOINED: ' + data.sessionId);

            var otherPlayer = _TEMP_setupPlayer(new THREE.Vector2(0, 0), false);
            var networkComponent = otherPlayer.getComponent('NetworkComponent');
            networkComponent.objectId = data.sessionId;    // TODO: object id generation; for now just use session id for player
            networkComponent.ownerId = data.sessionId;

            // TODO: tell the remote player the location of our local player
            game.networkMgr.sendTo_object({
                rpc: 'RPC_forcePosition',
                sessionId: networkComponent.ownerId,
                objectId: LevelController.getLocalPlayer().getComponent('NetworkComponent').objectId,
                data: {
                    x: LevelController.getLocalPlayer().position.x,
                    y: LevelController.getLocalPlayer().position.y
                }
            });
        });

        game.networkMgr.on('playerLeft', function(data) {
            console.log('ON PLAYER LEFT: ' + data.sessionId);
        });

        game.networkMgr.connect('localhost', 8080);
    }

    function _TEMP_setupPlayer(gridPos, isMine) {
        var Entity = require('./lib/core/entity');
        var GameObjectComponent = require('./lib/component/game_object_component');
        var AnimComponent = require('./lib/component/anim_component');
        var ActionComponent = require('./lib/player/action_component');
        var NetworkComponent = require('./lib/component/network_component');
        var SpriteComponent = require('./lib/component/sprite_component');
        var InputControllerComponent = require('./lib/player/input_controller_component');

        var entity = new Entity(game);
        entity.addComponent(new GameObjectComponent(entity));
        entity.addComponent(new AnimComponent(entity));
        entity.addComponent(new SpriteComponent(entity, { yOffset: -16 }));
        entity.addComponent(new ActionComponent(entity));
        entity.addComponent(new NetworkComponent(entity));
        entity.addComponent(new InputControllerComponent(entity));

        if (isMine) {
            var CameraComponent = require('./lib/player/follow_camera_component');

            entity.addComponent(new CameraComponent(entity));
        }

        LevelController.registerPlayer(entity);

        var Signals = require('./lib/signals');
        Signals.sendWarp(entity, gridPos);

        var networkComponent = entity.getComponent('NetworkComponent');
        networkComponent.isMine = isMine;
        // networkComponent.on('RPC_followPath', function(data) {
        //     console.log('received: ' + data);
        //     var actionComponent = entity.getComponent('ActionComponent');
        //     actionComponent.currentPath = data.path;
        //     actionComponent.currentPathIndex = 0;
        //     actionComponent.currentTargetPosX = data.targetPosX;
        //     actionComponent.currentTargetPosY = data.targetPosY;
        //     entity.position.x = data.startX;
        //     entity.position.y = data.startY;
        // });
        // networkComponent.on('RPC_forcePosition', function(data) {
        //     entity.position.x = data.x;
        //     entity.position.y = data.y;
        // });
        return entity;
    }

    function _TEMP_setupEnemy(gridPos) {
        var Entity = require('./lib/core/entity');
        var GameObjectComponent = require('./lib/component/game_object_component');
        var SpriteComponent = require('./lib/component/sprite_component');
        var AnimComponent = require('./lib/component/anim_component');
        var ActionComponent = require('./lib/enemy/action_component');
        var BehaviourFallen = require('./lib/behaviour_fallen');

        var entity = new Entity(game);
        entity.addComponent(new GameObjectComponent(entity));
        entity.addComponent(new SpriteComponent(entity, { yOffset: -16 }));
        entity.addComponent(new AnimComponent(entity));
        entity.addComponent(new ActionComponent(entity));
        entity.addComponent(new BehaviourFallen(entity));

        LevelController.registerEnemy(entity);

        var Signals = require('./lib/signals');
        Signals.sendWarp(entity, gridPos);

        var goComponent = entity.getComponent('GameObjectComponent');
        goComponent.collisionRect = new THREE.Vector2(30, 40);
        goComponent.collisionOffset = new THREE.Vector2(0, 15);

        return entity;
    }

    function _TEMP_setupHealer(gridPos) {
        var Entity = require('./lib/core/entity');
        var GameObjectComponent = require('./lib/component/game_object_component');
        var SpriteComponent = require('./lib/component/sprite_component');
        var AnimComponent = require('./lib/component/anim_component');

        var entity = new Entity(game);
        entity.addComponent(new GameObjectComponent(entity));
        entity.addComponent(new SpriteComponent(entity, { yOffset: -16 }));
        entity.addComponent(new AnimComponent(entity));

        var animComponent = entity.getComponent('AnimComponent');
        animComponent.play('strytell');

        LevelController.registerEnemy(entity);

        var goComponent = entity.getComponent('GameObjectComponent');
        goComponent.currentGridPosition.copy(gridPos);
        util.gridToWorldCoord(gridPos, entity.position);

        goComponent.collisionRect = new THREE.Vector2(32, 62);
        goComponent.collisionOffset = new THREE.Vector2(0, 30);

        var self = goComponent;
        goComponent.onStart = function() {
            self.entity.addSignalListener('interact', self._onInteract.bind(self));
        };

        goComponent._onInteract = function (fromEntity) {
            console.log('Stay awhile and listen...');

            // TODO: heal player (fromEntity)
        };

        return entity;
    }

    function _TEMP_setupObject(gridPos) {
        var Entity = require('./lib/core/entity');
        var GameObjectComponent = require('./lib/component/game_object_component');
        var SpriteComponent = require('./lib/component/sprite_component');

        var entity = new Entity(game);
        entity.addComponent(new GameObjectComponent(entity));
        entity.addComponent(new SpriteComponent(entity, { yOffset: -16 }));

        LevelController.registerEnemy(entity);

        var goComponent = entity.getComponent('GameObjectComponent');
        goComponent.currentGridPosition.copy(gridPos);
        util.gridToWorldCoord(gridPos, entity.position);

        goComponent.collisionRect = new THREE.Vector2(32, 26);
        goComponent.collisionOffset = new THREE.Vector2(-5, 0);

        var SpriteMgr = require('./lib/core/sprite_mgr');
        var self = goComponent;

        goComponent.onStart = function() {
            self.entity.addSignalListener('interact', self._onInteract.bind(self));

            var sprite = SpriteMgr.getSprite('chest1');
            self.spriteClosed = sprite[0];
            self.spriteOpened = sprite[2];

            self.spriteComponent.setSprite(self.spriteClosed);
        };

        goComponent._onInteract = function (fromEntity) {
            self.spriteComponent.setSprite(self.spriteOpened);
            self.isTargetable = false;
        };

        return entity;
    }
});
