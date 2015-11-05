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
        // this.game.load.image('tile_1', 'assets/tile_1.png');
        
        // this.game.load.atlasJSONArray(
        //     'tiles',
        //     'assets/tiles.png',
        //     'assets/tiles.json'
        // );
        
        // TODO: fix this from appending .xml extension even though we're using tmx
        this.game.load.xml('assets/maps/test_1');
    }
    
    create() {
        this.game.world.setBounds(0, 0, 2000, 2000);
        
        mapUtils.createMap(this.game, 'assets/maps/test_1', (err, map) => {
            // TODO:
            // - get index for background layer
            // - foreach tile 
            
            console.log(map);
            
            let layerIndex = map.getLayerIndex('background');
            
            let width = map.width; let height = map.height;
            let tileWidth = map.tileWidth; let tileHeight = map.tileHeight;
            let halfTileWidth = tileWidth / 2; let halfTileHeight = tileHeight / 2;
            let xPos = 0; let yPos = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let worldPos = map.gridToWorldCoord([x, y]);
                    console.log('x/y: %s/%s', worldPos[0], worldPos[1]);
                    this.game.add.sprite(worldPos[0] - halfTileWidth, worldPos[1] - halfTileHeight, 'tile_0');
                    // this.game.add.sprite(0, 10, 'tile_0');
                }
            }
            
            // let a = map.gridToWorldCoord([0, 0]);
            // console.log('x/y: %s/%s', a[0], a[1]);
            // a = map.gridToWorldCoord([1, 0]);
            // console.log('x/y: %s/%s', a[0], a[1]);
        });
        
        // this.game.add.sprite(0, 0, 'tile_0');
        // this.game.add.sprite(64, 0, 'tile_0');
        // this.game.add.sprite(32 + 64, 16, 'tile_1');
        
        // this.game.add.sprite(0, 0, 'tiles', 'tile_0');
        // this.game.add.sprite(32, 16, 'tiles', 'tile_0');
        // this.game.add.sprite(64, 0, 'tiles', 'tile_1');
        
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
        this.game.debug.cameraInfo(this.game.camera, 10, 20);
    }
}

module.exports = BootState;
