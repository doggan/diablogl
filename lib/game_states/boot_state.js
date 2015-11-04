'use strict';

var tmx = require('tmx-parser');

function create_map(game, map_name, cb) {
    let map_data = game.cache.getXML(map_name);
    let serializer = new XMLSerializer();
    let map_str = serializer.serializeToString(map_data);
    tmx.parse(map_str, '', function(err, map) {
        cb(map);
    });
}

class BootState {
    preload() {
        this.game.add.plugin(Phaser.Plugin.Debug);
        
        this.game.load.atlasJSONArray(
            'plrgfx/warrior/wls/wlsas',
            'assets/plrgfx/warrior/wls/wlsas/atlas.png',
            'assets/plrgfx/warrior/wls/wlsas/atlas.json'
        );
        
        // this.game.load.image('tile_0', 'assets/tile_0.png');
        // this.game.load.image('tile_1', 'assets/tile_1.png');
        
        this.game.load.atlasJSONArray(
            'tiles',
            'assets/tiles.png',
            'assets/tiles.json'
        );
        
        this.game.load.xml('assets/maps/test_1');
    }
    
    create() {
        create_map(this.game, 'assets/maps/test_1', (map_data) => {
            console.log(map_data.height);
        });
        
        // this.game.add.sprite(0, 0, 'tile_0');
        // this.game.add.sprite(64, 0, 'tile_0');
        // this.game.add.sprite(32 + 64, 16, 'tile_1');
        
        this.game.add.sprite(0, 0, 'tiles', 'tile_0');
        this.game.add.sprite(32, 16, 'tiles', 'tile_0');
        this.game.add.sprite(64, 0, 'tiles', 'tile_1');
        
        let sprite = this.game.add.sprite(0, 0, 'plrgfx/warrior/wls/wlsas');
        
        for (let i = 0; i < 8; i++) {
            sprite.animations.add(
                ('plrgfx/warrior/wls/wlsas/' + i),
                Phaser.Animation.generateFrameNames(
                    'plrgfx/warrior/wls/wlsas/' + i + '/', 0, 9, '', 2),
            10, true, false);
        }
        
        sprite.animations.play('plrgfx/warrior/wls/wlsas/0');
    }
    
    render() {
        // this.game.debug.cameraInfo(this.game.camera, 10, 20);
    }
}

module.exports = BootState;
