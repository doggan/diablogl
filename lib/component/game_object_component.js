'use strict';

var inherits = require('inherits'),
    assert = require('assert'),
    Component = require('./../core/component'),
    MaterialMgr = require('./../core/material_mgr'),
    util = require('./../util');

var LevelController = require('./../level_controller');

function GameObjectComponent (entity) {
    Component.call(this, entity);

    this.game = entity.game;

    this.currentGridPosition = new THREE.Vector2();

    this.isTargeted = false;
    this.targetedFrame = -1;
    this.isTargetable = true;

    this.collisionRect = new THREE.Vector2();
    this.collisionOffset = new THREE.Vector2();

    this.entity.addSignalListener('target', this._onTargeted.bind(this));
    this.entity.addSignalListener('warp', this._onWarp.bind(this));
    this.game.on('frameEnd', this._frameEnd.bind(this));
}

inherits(GameObjectComponent, Component);

GameObjectComponent.prototype.start = function() {
    this.spriteComponent = this.entity.getComponent('SpriteComponent');

    var self = this;
    this.spriteComponent.onSelectMaterialCallback = function(textureId) {
        if (self.isTargeted) {
            if (self.entity.getComponent('BehaviourFallen')) {
                return MaterialMgr.getSelectedTargetMaterial(textureId);
            } else {
                return MaterialMgr.getSelectedTargetMaterial2(textureId);
            }
        } else {
            return MaterialMgr.getBasicMaterial(textureId);
        }
    };
};

GameObjectComponent.prototype.destroy = function() {
    this.game.removeListener('frameEnd', this._frameEnd.bind(this));
};

GameObjectComponent.prototype._onWarp = function (gridPos) {
    this.setGridPosition(gridPos);
    util.gridToWorldCoord(gridPos, this.entity.position);
};

GameObjectComponent.prototype._onTargeted = function () {
    assert(this.isTargetable);

    this.isTargeted = true;
    this.targetedFrame = this.game.time.frameCount;

    this.spriteComponent.requestMaterialChange();
};

GameObjectComponent.prototype._onUntargeted = function () {
    assert(this.isTargeted);

    this.isTargeted = false;

    this.spriteComponent.requestMaterialChange();
};

/**
 * Set the grid position of this entity.
 */
GameObjectComponent.prototype.setGridPosition = function (gridPosition) {
    // Ignore if we are already at this position.
    if (gridPosition.equals(this.currentGridPosition)) {
        return;
    }

    // Update collision.
    LevelController.unsetDynamicCollision(this.currentGridPosition);
    LevelController.setDynamicCollision(gridPosition);

    this.currentGridPosition.copy(gridPosition);
};

GameObjectComponent.prototype.update = function() {
    // Entity collision debug draw:
    // var centerPosX = this.entity.position.x + this.collisionOffset.x;
    // var centerPosY = this.entity.position.y + this.collisionOffset.y;
    // var halfWidth = this.collisionRect.x * 0.5;
    // var halfHeight = this.collisionRect.y * 0.5;
    // DbgDraw.drawLineStrip([
    //     new THREE.Vector3(centerPosX - halfWidth, centerPosY - halfHeight, 1000),
    //     new THREE.Vector3(centerPosX + halfWidth, centerPosY - halfHeight, 1000),
    //     new THREE.Vector3(centerPosX + halfWidth, centerPosY + halfHeight, 1000),
    //     new THREE.Vector3(centerPosX - halfWidth, centerPosY + halfHeight, 1000),
    //     new THREE.Vector3(centerPosX - halfWidth, centerPosY - halfHeight, 1000)],
    //     'red');
};

GameObjectComponent.prototype._frameEnd = function () {
    if (this.isTargeted) {
        if (this.targetedFrame !== this.game.time.frameCount) {
            this._onUntargeted();
        }
    }
};

module.exports = GameObjectComponent;
