'use strict';

document.addEventListener("DOMContentLoaded", main);

/**
 * Application entry point.
 */
function main() {
    let appOptions = {
        showDebugStats: true,
        canvasClearColor: 0x000000
    };

    let app = require('./app');
    app.setup(appOptions);
    app.run();
}
