'use strict';

let App = require('../app'),
    THREE = require('three'),
    MaterialMgr = require('../core/material_mgr'),
    util = require('../util');

class SpriteComponent {
    constructor(options) {
        // Additional offset for the mesh to make the 'feet' of the
        // texture align with the actual entity position.
        // this.yOffset = options.yOffset || 0;
        this.yOffset = -16;

        // Simple quad geometry.
        let geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0));
        geometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0));
        geometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0));
        geometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0));

        geometry.faces.push(new THREE.Face3(0, 1, 3));
        geometry.faces.push(new THREE.Face3(1, 2, 3));

        geometry.faceVertexUvs = [
            []
        ];
        geometry.computeBoundingSphere();

        // Create the mesh.
        this._mesh = new THREE.Mesh(geometry,
            new THREE.MeshBasicMaterial({
                color: 'magenta'
            }));
        this._mesh.scale.set(96, 96, 1); // arbitrary initialization size
        App.activeScene.add(this._mesh);

        this.onSelectMaterialCallback = null;
        this.currentTextureId = -1;

        // For debugging the mesh position:
        this.testMesh = new THREE.Mesh(geometry,
            new THREE.MeshBasicMaterial({
                wireframe: true,
                color: 'magenta'
            }));
        App.activeScene.add(this.testMesh);
    }

    start() {
        this.gameObjectComponent = this.entity.getComponent('PlayerComponent');
    }

    // SpriteComponent.prototype.destroy = function() {
    //     this.game.scene.remove(this._mesh);
    // };

    setSprite(spriteInfo) {
        this._mesh.scale.set(spriteInfo.w, spriteInfo.h, 1);

        let uvs = spriteInfo.uvs;
        this._mesh.geometry.faceVertexUvs[0][0] = [uvs[1], uvs[2], uvs[0]];
        this._mesh.geometry.faceVertexUvs[0][1] = [uvs[2], uvs[3], uvs[0]];
        this._mesh.geometry.uvsNeedUpdate = true;

        // Update material if texture id changed.
        let textureId = spriteInfo.textureId;
        if (this.currentTextureId !== textureId) {
            this.currentTextureId = textureId;

            this.requestMaterialChange();
        }
    }

    requestMaterialChange() {
        // Trigger callback.
        // TODO: hack from game_object callback
        // let desiredMaterial = this.onSelectMaterialCallback(this.currentTextureId);
        let desiredMaterial = MaterialMgr.getBasicMaterial(this.currentTextureId);

        // Update material if it changed.
        if (this._mesh.material !== desiredMaterial) {
            this._mesh.material = desiredMaterial;

            // TODO: can we remove this?
            // Since the initial blank material for the geometry may not have had
            // UV coordinates, we need to refresh the buffers completely for
            // the UV coordinates of the new material to take effect.
            this._mesh.geometry.buffersNeedUpdate = true;
        }
    }

    update() {
        let posX = this.gameObjectComponent.position.x;
        let posY = this.gameObjectComponent.position.y;

        // TODO: by using the fact that our tiles are rendered as the sum of col + row (zcoord),
        // we can use the same formula to place our player correctly.
        let gridCoord = new THREE.Vector2();
        util.worldToGridCoord(this.gameObjectComponent.position, gridCoord);
        let TODO_zOffset = gridCoord.x + gridCoord.y;

        // Offset the mesh so that entity position is anchored to bottom of quad (and not the center).
        let totalYOffset = this._mesh.scale.y / 2 + this.yOffset;

        this._mesh.position.set(posX, posY + totalYOffset, TODO_zOffset);

        // For debugging the mesh position:
        // this.testMesh.scale.set(this._mesh.scale.x, this._mesh.scale.y, 1);
        // this.testMesh.position.set(posX, posY + totalYOffset, TODO_zOffset + 100);
    }
}

module.exports = function(options) {
    return new SpriteComponent(options);
};
