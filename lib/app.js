let compo = require('compojs');

/**
 * The application singleton.
 * Serves as the main driver for this program.
 */
class App {
    /**
     * Initialize the application.
     */
    setup(options) {
        this._engine = compo.createEngine({
                targetFps: 30
            })
            .registerComponent('SpriteComponent', require('./component/sprite_component'))
            .registerComponent('AnimComponent', require('./component/anim_component'))
            .registerComponent('PlayerComponent', require('./player_component'))
            .registerComponent('PlayerActionComponent', require('./player/action_component'))
            .registerComponent('PlayerInputComponent', require('./player/input_controller_component'))
            .registerComponent('FollowCameraComponent', require('./player/follow_camera_component'))

            .registerComponent('GameSystem', require('./game_system'))
            .registerComponent('RenderSystem', require('./render_system'))
            .registerComponent('InputSystem', require('./input_system'));

        // Create the systems.
        let systems = this._engine.createEntity('systems')
            .addComponent('GameSystem')
            .addComponent('RenderSystem', {
                showDebugStats: options.showDebugStats,
                clearColor: options.canvasClearColor
            })
            .addComponent('InputSystem');

        // Cache the systems.
        this._renderSystem = systems.getComponent('RenderSystem');
        this._inputSystem = systems.getComponent('InputSystem');
    }

    /**
     * Gogogo!
     */
    run() {
        this._engine.run();
    }

    get engine() {
        return this._engine;
    }

    get deltaTime() {
        return this._engine.time.deltaTime;
    }

    get canvas() {
        return this._renderSystem.canvas;
    }

    get activeScene() {
        return this._renderSystem.scene;
    }

    get activeCamera() {
        return this._renderSystem.camera;
    }

    get inputSystem() {
        return this._inputSystem;
    }
}

module.exports = new App();
