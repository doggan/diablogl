'use strict';

var inherits = require('inherits'),
    Component = require('./../core/component'),
    util = require('./../util');

function SpriteComponent(entity, options) {
    Component.call(this, entity);

    this.game = entity.game;
    this.THREE = this.game.THREE;

    options = options || {};

    // Additional offset for the mesh to make the 'feet' of the
    // texture align with the actual entity position.
    this.yOffset = options.yOffset || 0;

    // Simple quad geometry.
    var geometry = new this.THREE.Geometry();
    geometry.vertices.push(new this.THREE.Vector3(-0.5, -0.5, 0));
    geometry.vertices.push(new this.THREE.Vector3(0.5, -0.5, 0));
    geometry.vertices.push(new this.THREE.Vector3(0.5, 0.5, 0));
    geometry.vertices.push(new this.THREE.Vector3(-0.5, 0.5, 0));

    geometry.faces.push(new this.THREE.Face3(0, 1, 3));
    geometry.faces.push(new this.THREE.Face3(1, 2, 3));

    geometry.faceVertexUvs = [
        []
    ];
    geometry.computeBoundingSphere();

    // Create the mesh.
    this.mesh = new this.THREE.Mesh(geometry,
        new this.THREE.MeshBasicMaterial({
            color: 'magenta'
        }));
    this.mesh.scale.set(96, 96, 1); // arbitrary initialization size
    this.game.scene.add(this.mesh);

    this.onSelectMaterialCallback = null;
    this.currentTextureId = -1;

    // For debugging the mesh position:
    // this.testMesh = new this.THREE.Mesh(geometry,
    //     new this.THREE.MeshBasicMaterial({
    //         wireframe: true,
    //         color: 'magenta'
    // }));
    // this.game.scene.add(this.testMesh);
}

inherits(SpriteComponent, Component);

SpriteComponent.prototype.destroy = function() {
    this.game.scene.remove(this.mesh);
};

SpriteComponent.prototype.setSprite = function(spriteInfo) {
    this.mesh.scale.set(spriteInfo.w, spriteInfo.h, 1);

    var uvs = spriteInfo.uvs;
    this.mesh.geometry.faceVertexUvs[0][0] = [uvs[1], uvs[2], uvs[0]];
    this.mesh.geometry.faceVertexUvs[0][1] = [uvs[2], uvs[3], uvs[0]];
    this.mesh.geometry.uvsNeedUpdate = true;

    // Update material if texture id changed.
    var textureId = spriteInfo.textureId;
    if (this.currentTextureId !== textureId) {
        this.currentTextureId = textureId;

        this.requestMaterialChange();
    }
};

SpriteComponent.prototype.requestMaterialChange = function() {
    // Trigger callback.
    var desiredMaterial = this.onSelectMaterialCallback(this.currentTextureId);

    // Update material if it changed.
    if (this.mesh.material !== desiredMaterial) {
        this.mesh.material = desiredMaterial;

        // TODO: can we remove this?
        // Since the initial blank material for the geometry may not have had
        // UV coordinates, we need to refresh the buffers completely for
        // the UV coordinates of the new material to take effect.
        this.mesh.geometry.buffersNeedUpdate = true;
    }
};

SpriteComponent.prototype.update = function() {
    var posX = this.entity.position.x;
    var posY = this.entity.position.y;

    // TODO: by using the fact that our tiles are rendered as the sum of col + row (zcoord),
    // we can use the same formula to place our player correctly.
    var gridCoord = new THREE.Vector2();
    util.worldToGridCoord(this.entity.position, gridCoord);
    var TODO_zOffset = gridCoord.x + gridCoord.y;

    // Offset the mesh so that entity position is anchored to bottom of quad (and not the center).
    var totalYOffset = this.mesh.scale.y / 2 + this.yOffset;

    this.mesh.position.set(posX, posY + totalYOffset, TODO_zOffset);

    // For debugging the mesh position:
    // this.testMesh.scale.set(this.mesh.scale.x, this.mesh.scale.y, 1);
    // this.testMesh.position.set(posX, posY + totalYOffset, TODO_zOffset + 100);
};

module.exports = SpriteComponent;
