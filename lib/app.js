'use strict';

/**
 * The application singleton.
 * Serves as the main driver for this program.
 */
class App {
    go() {
        this.game = new Phaser.Game(400, 400, Phaser.AUTO, 'canvas-container');
        
        this.game.state.add("BootState", require('./boot_state'));
        
        this.game.state.start("BootState");
    }
}

module.exports = new App();
