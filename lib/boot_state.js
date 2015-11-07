'use strict';

let mapUtils = require('./map_utils');

class BootState {
    preload() {
        this.game.add.plugin(Phaser.Plugin.Debug);
        
        this.game.load.atlasJSONArray(
            'plrgfx/warrior/wls/wlsas',
            'assets/plrgfx/warrior/wls/wlsas/atlas.png',
            'assets/plrgfx/warrior/wls/wlsas/atlas.json'
        );
        
        this.game.load.image('tile_0', 'assets/tile_0.png');
        
        mapUtils.atlasNamePrefix = 'maps/atlases/';
        mapUtils.preloadMap(this.game, 'maps/map_0', 'assets/maps/map_0.tmx');
        this.game.load.atlasJSONArray(
            'maps/atlases/tiled_dungeon',
            'assets/maps/atlases/tiled_dungeon.png',
            'assets/maps/atlases/tiled_dungeon.json');
        this.game.load.atlasJSONArray(
            'maps/atlases/tiled_dungeon_2x2',
            'assets/maps/atlases/tiled_dungeon_2x2.png',
            'assets/maps/atlases/tiled_dungeon_2x2.json');
    }
    
    create() {
        this.game.world.setBounds(0, 0, 2000, 2000);
        
        this.backgroundGroup = this.game.add.group();
        this.objectGroup = this.game.add.group();
        
        let dx = 200; let dy = 150;
        this.backgroundGroup.position.set(dx, dy);
        this.objectGroup.position.set(dx, dy);
        
        mapUtils.createMap(this.game, 'maps/map_0', (err, map) => {
            if (err) {
                return console.error(err);
            }
            
            function renderLayer(map, layerName, parentGroup) {
                let map_w = map.width; let map_h = map.height;
                let map_tw = map.tileWidth; let map_th = map.tileHeight;
                let map_tw_2 = map_tw / 2; let map_th_2 = map_th / 2;
                
                let layerIndex = map.getLayerIndex(layerName);
                for (let y = 0; y < map_h; y++) {
                    for (let x = 0; x < map_w; x++) {
                        let tileInfo = map.getTileInfo(layerIndex, x, y);
                        if (!tileInfo) {
                            continue;
                        }
                        
                        let atlasName = map.getTilesetAtlasName(tileInfo.tilesetIndex);
                        if (!atlasName) {
                            console.warn('Undefined tilset atlas.');
                            continue;
                        }
                        
                        let worldPos = map.tileToWorldPos([x, y]);
                        let tw = tileInfo.tileWidth; let th = tileInfo.tileHeight;
                        
                        let xPos = worldPos[0] - map_tw_2;
                        let yPos = worldPos[1] -
                            // align the bottom of the image with top of grid cell
                            th + map_th +
                            // align leftmost cell with grid cell
                            (tw / map_tw - 1) * map_th_2;
                        
                        parentGroup.create(xPos, yPos, atlasName, tileInfo.tileId);
                    }
                }
            }
            
            console.log(map);
            
            renderLayer(map, 'background', this.backgroundGroup);
            renderLayer(map, 'object', this.objectGroup);
        });
        
        let playerSprite = this.objectGroup.create(0, 0, 'plrgfx/warrior/wls/wlsas');
        
        for (let i = 0; i < 8; i++) {
            playerSprite.animations.add(
                ('plrgfx/warrior/wls/wlsas/' + i),
                Phaser.Animation.generateFrameNames(
                    'plrgfx/warrior/wls/wlsas/' + i + '/', 0, 9, '', 2),
            10, true, false);
        }
        
        playerSprite.animations.play('plrgfx/warrior/wls/wlsas/0');
        
        this.cursors = this.game.input.keyboard.createCursorKeys();
        this.game.camera.follow(playerSprite);
        
        this.playerSprite = playerSprite;
    }
    
    update() {
        // TODO: not correct way to sort for isometric perspective...
        this.objectGroup.sort('y', Phaser.Group.SORT_ASCENDING);
        
        let dt = this.game.time.elapsed / 1000;
        let speed = 250;
        if (this.cursors.up.isDown) {
            this.playerSprite.y -= speed * dt;
        } else if (this.cursors.down.isDown) {
            this.playerSprite.y += speed * dt;
        }
        if (this.cursors.left.isDown) {
            this.playerSprite.x -= speed * dt;
        } else if (this.cursors.right.isDown) {
            this.playerSprite.x += speed * dt;
        }
    }
    
    render() {
        // this.game.debug.cameraInfo(this.game.camera, 10, 20);
    }
}

module.exports = BootState;
