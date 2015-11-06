'use strict';

let mapUtils = require('./map_utils');

function getSpriteAtlasName(tilesetIndex) {
    switch (tilesetIndex) {
        case 1: return 'assets/maps/test_atlas';
    }
    
    return null;
}

class BootState {
    preload() {
        this.game.add.plugin(Phaser.Plugin.Debug);
        
        this.game.load.atlasJSONArray(
            'plrgfx/warrior/wls/wlsas',
            'assets/plrgfx/warrior/wls/wlsas/atlas.png',
            'assets/plrgfx/warrior/wls/wlsas/atlas.json'
        );
        
        this.game.load.image('assets/tile_0', 'assets/tile_0.png');
        this.game.load.image('assets/tile_big', 'assets/tile_big.png');
        this.game.load.image('assets/tile_stairs', 'assets/tile_stairs.png');
        
        this.game.load.atlasJSONArray(
            'assets/maps/test_atlas',
            'assets/maps/test_atlas.png',
            'assets/maps/test_atlas.json'
        );
        
        mapUtils.preloadMap(this.game, 'assets/maps/test_1', 'assets/maps/test_1.tmx');
    }
    
    create() {
        this.game.world.setBounds(0, 0, 2000, 2000);
        
        mapUtils.createMap(this.game, 'assets/maps/test_1', (err, map) => {
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
                        
                        let atlasName = getSpriteAtlasName(tileInfo.tilesetIndex);
                        
                        let worldPos = map.tileToWorldPos([x, y]);
                        let tw = tileInfo.tileWidth; let th = tileInfo.tileHeight;
                        
                        let xPos = worldPos[0] - map_tw_2;
                        let yPos = worldPos[1] -
                            // align the bottom of the image with top of grid cell
                            th + map_th +
                            // align leftmost cell with grid cell
                            (tw / map_tw - 1) * map_th_2;
                        
                        if (atlasName !== null) {
                            parentGroup.create(xPos, yPos, atlasName, tileInfo.tileId);
                        } else {
                            if (layerName === 'abc') {
                                parentGroup.create(xPos, yPos, 'assets/tile_stairs');
                            } else {
                                parentGroup.create(xPos, yPos, 'assets/tile_big');
                            }
                        }
                    }
                }
            }
            
            console.log(map);
            
            let dx = 350; let dy = 100;
            
            let group = this.game.add.group();
            group.position.set(dx, dy);
            
            renderLayer(map, 'background', group);
            renderLayer(map, 'abc', group);
            
            // this.game.add.sprite(0 - map_tw_2, 0, 'assets/tile_0');
            // this.game.add.sprite(dx - map_tw_2, dy, 'assets/tile_0');
        });
        
        let playerSprite = this.game.add.sprite(0, 0, 'plrgfx/warrior/wls/wlsas');
        
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
