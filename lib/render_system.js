/*global performance, threeStats, glStats, rStats*/

'use strict';

let THREE = require('three');

class RenderSystem {
    constructor(options) {
        this._canvas = document.getElementById('canvas');
        if (!this._canvas) {
            throw "'canvas' element not found.";
        }

        let viewSize = this._canvas.height / 2;
        let aspectRatio = this._canvas.width / this._canvas.height;

        // Coordinate system: right hand rule (+z towards camera, -z away from camera).
        this._camera = new THREE.OrthographicCamera(-aspectRatio * viewSize, aspectRatio * viewSize,
            viewSize, -viewSize,
            0.1, 10000);
        this._camera.position.z = 10000;
        // TODO: ^^^^ ????

        this._scene = new THREE.Scene();

        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas
        });

        let clearColor = typeof options.clearColor !== 'undefined' ? options.clearColor : 0x00FFFF;
        this._renderer.setClearColor(clearColor, 1);

        // window.addEventListener('resize', this._onWindowResize.bind(this), false);

        this._buildStats();

        // Toggle debug stats overlay.
        if (!options.showDebugStats) {
            let statsObject = document.getElementsByClassName('rs-base')[0];
            if (statsObject) {
                statsObject.style.display = 'none';
            }
        }
    }

    get scene() {
        return this._scene;
    }

    get camera() {
        return this._camera;
    }

    get canvas() {
        return this._canvas;
    }

    _buildStats() {
        this._stats_gl = new glStats();
        this._stats = new rStats({
            CSSPath: "css/",
            values: {
                fps: {
                    caption: 'Framerate (FPS)',
                    below: 59
                },
                frame: {
                    caption: 'Total frame time (ms)',
                    over: 16,
                    average: true,
                    avgMs: 100
                },
                calls: {
                    caption: 'Calls (three.js)',
                    over: 3000
                },
                rstats: {
                    caption: 'rStats update (ms)',
                    average: true,
                    avgMs: 100
                },
                limit: {
                    caption: 'Limit (MB)'
                },
                used: {
                    caption: 'Used (MB)'
                },
                total: {
                    caption: 'Total (MB)'
                },
                remaining: {
                    caption: 'Remaining (MB)'
                },
            },
            groups: [{
                caption: 'General',
                values: ['fps', 'frame', 'update', 'render', 'rstats']
            }, {
                caption: 'Memory',
                values: ['limit', 'used', 'total', 'remaining']
            }],
            plugins: [
                new threeStats(this._renderer),
                this._stats_gl
            ]
        });
    }

    update() {
        this._stats('FPS').frame();
        this._stats_gl.start();

        this._stats('render').start();
        this._renderer.clearDepth();
        this._renderer.render(this._scene, this._camera);
        this._stats('render').end();

        this._stats('rStats').start();
        this._stats('limit').set(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        this._stats('total').set(performance.memory.totalJSHeapSize / 1024 / 1024);
        this._stats('used').set(performance.memory.usedJSHeapSize / 1024 / 1024);
        this._stats('remaining').set((performance.memory.totalJSHeapSize - performance.memory.usedJSHeapSize) / 1024 / 1024);
        this._stats().update();
        this._stats('rStats').end();
    }
}

module.exports = function(options) {
    return new RenderSystem(options);
};
