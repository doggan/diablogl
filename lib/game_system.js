let App = require('./app');

function loadTestScene() {
    console.log('Load test scene...');

    let ResourceLoader = require('./resource_loader');
    ResourceLoader.loadCommon(() => {
        ResourceLoader.loadLevel(0, () => {
            let LevelController = require('./level_controller');
            LevelController.TEMP_setCurrentLevel();

            let FileMgr = require('./core/file_mgr');
            let dun = FileMgr.getFile('levels/towndata/sector1s.dun');
            let til = FileMgr.getFile('levels/towndata/town.til');
            let min = FileMgr.getFile('levels/towndata/town.min');
            let renderer = require('./level_renderer');
            renderer.drawDungeon(dun, til, min, App.activeScene);

            App.engine.createEntity('player')
                .addComponent('SpriteComponent')
                .addComponent('AnimComponent')
                .addComponent('PlayerComponent')
                .addComponent('PlayerActionComponent')
                .addComponent('PlayerInputComponent')
                .addComponent('FollowCameraComponent');
        });
    });
}

let util = require('./util'),
    THREE = require('three');

let DbgDraw = require('three-debug-draw')(THREE),
    LevelController = require('./level_controller');

module.exports = function() {
    let self = {};

    self.start = function() {
        loadTestScene();
    };

    self.update = function() {
        {
            let mousePos = App.inputSystem.getMousePosition();
            let gridPos = new THREE.Vector2();
            util.screenToWorldCoord(600, 400, mousePos, App.activeCamera, gridPos);
            util.worldToGridCoord(gridPos, gridPos);

            if (LevelController.checkStaticCollision(gridPos)) {
                util.dbgDrawTile(gridPos.x, gridPos.y, 'red', DbgDraw);
            } else {
                util.dbgDrawTile(gridPos.x, gridPos.y, 'green', DbgDraw);
            }

            DbgDraw.render(App.activeScene);
        }
    };

    return self;
};
