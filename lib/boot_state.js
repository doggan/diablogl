'use strict';

let mapUtils = require('./map_utils'),
    LevelController = require('./level_controller'),
    Player = require('./player').Player;

class BootState {
    preload() {
        // this.game.add.plugin(Phaser.Plugin.Debug);

        LevelController.setup(this.game);

        this.game.load.atlasJSONArray(
            'characters/skeleton',
            'assets/characters/skeleton/atlas.png',
            'assets/characters/skeleton/atlas.json'
        );

        // this.game.load.image('square', 'assets/square.png');
        // this.game.load.image('square_small', 'assets/square_small.png');

        mapUtils.ATLAS_NAME_PREFIX = 'maps/atlases/';
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
        this.backgroundGroup = this.game.add.group();
        this.objectGroup = this.game.add.group();
        this._isCreationFinished = false;

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
            // renderLayer(map, 'object', this.objectGroup);

            LevelController.tempLoad(map);
            this._map = map;
            this._onMapFinishedLoading();
        });
    }

    _onMapFinishedLoading() {
        // Set the world bounds based on the map size, with (0,0) at the center.
        let totalWidth = this._map.totalWidth;
        let totalHeight = this._map.totalHeight;
        this.game.world.setBounds(
            -totalWidth, -totalHeight,
            totalWidth * 2, totalHeight * 2);

        this._player = new Player(this.game, this.objectGroup);
        this._player.position = this._map.tileToVirtualPos([0, 0]);

        this.game.camera.follow(this._player.sprite);

        this._isCreationFinished = true;
    }

    update() {
        if (!this._isCreationFinished) {
            return;
        }

        // TODO: not correct way to sort for isometric perspective...
        this.objectGroup.sort('y', Phaser.Group.SORT_ASCENDING);

        let dt = this.game.time.elapsed / 1000;
        this._player.update(this.game, dt);
        // this.game.debug.spriteBounds(this._player.sprite);

        this._debugDrawCursorPosition();
    }

    _debugDrawCursorPosition() {
        let mouseWorldPos = [this.game.input.worldX, this.game.input.worldY];
        let tilePos = this._map.worldToTilePos(mouseWorldPos);
        let worldPos = this._map.tileToWorldPosCenter(tilePos);

        let color = 'rgba(0,255,0,0.5)';
        if (tilePos[0] < 0 || tilePos[0] >= this._map.width ||
            tilePos[1] < 0 || tilePos[1] >= this._map.height) {
            color = 'rgba(255,0,0,0.5)';
        }
        let tw_2 = this._map.tileWidth / 2;
        let th_2 = this._map.tileHeight / 2;
        let l = [worldPos[0] - tw_2, worldPos[1]];
        let r = [worldPos[0] + tw_2, worldPos[1]];
        let t = [worldPos[0], worldPos[1] - th_2];
        let b = [worldPos[0], worldPos[1] + th_2];
        let l0 = new Phaser.Line(l[0], l[1], t[0], t[1]);
        let l1 = new Phaser.Line(t[0], t[1], r[0], r[1]);
        let l2 = new Phaser.Line(r[0], r[1], b[0], b[1]);
        let l3 = new Phaser.Line(b[0], b[1], l[0], l[1]);
        this.game.debug.geom(l0, color);
        this.game.debug.geom(l1, color);
        this.game.debug.geom(l2, color);
        this.game.debug.geom(l3, color);
    }

    render() {
        // this.game.debug.cameraInfo(this.game.camera, 10, 20);
    }
}

module.exports = BootState;
