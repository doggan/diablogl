'use strict';

let THREE = require('three'),
    assert = require('assert'),
    MaterialMgr = require('./core/material_mgr'),
    util = require('./util');

let LevelController = require('./level_controller');

class PlayerComponent {
    constructor() {
        this.currentGridPosition = new THREE.Vector2();

        this.isTargeted = false;
        this.targetedFrame = -1;
        this.isTargetable = true;

        this.collisionRect = new THREE.Vector2();
        this.collisionOffset = new THREE.Vector2();

        this.position = new THREE.Vector2();

        // this.entity.addSignalListener('target', this._onTargeted.bind(this));
        // this.entity.addSignalListener('warp', this._onWarp.bind(this));
        // this.game.on('frameEnd', this._frameEnd.bind(this));
    }

    start() {
        this.spriteComponent = this.entity.getComponent('SpriteComponent');

        let self = this;
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
    }

    // destroy() {
    //     this.game.removeListener('frameEnd', this._frameEnd.bind(this));
    // }

    _onWarp(gridPos) {
        this.setGridPosition(gridPos);
        util.gridToWorldCoord(gridPos, this.entity.position);
    }

    _onTargeted() {
        assert(this.isTargetable);

        this.isTargeted = true;
        this.targetedFrame = this.game.time.frameCount;

        this.spriteComponent.requestMaterialChange();
    }

    _onUntargeted() {
        assert(this.isTargeted);

        this.isTargeted = false;

        this.spriteComponent.requestMaterialChange();
    }

    /**
     * Set the grid position of this entity.
     */
    setGridPosition(gridPosition) {
        // Ignore if we are already at this position.
        if (gridPosition.equals(this.currentGridPosition)) {
            return;
        }

        // Update collision.
        LevelController.unsetDynamicCollision(this.currentGridPosition);
        LevelController.setDynamicCollision(gridPosition);

        this.currentGridPosition.copy(gridPosition);
    }

    update() {
        // Entity collision debug draw:
        // let centerPosX = this.entity.position.x + this.collisionOffset.x;
        // let centerPosY = this.entity.position.y + this.collisionOffset.y;
        // let halfWidth = this.collisionRect.x * 0.5;
        // let halfHeight = this.collisionRect.y * 0.5;
        // DbgDraw.drawLineStrip([
        //     new THREE.Vector3(centerPosX - halfWidth, centerPosY - halfHeight, 1000),
        //     new THREE.Vector3(centerPosX + halfWidth, centerPosY - halfHeight, 1000),
        //     new THREE.Vector3(centerPosX + halfWidth, centerPosY + halfHeight, 1000),
        //     new THREE.Vector3(centerPosX - halfWidth, centerPosY + halfHeight, 1000),
        //     new THREE.Vector3(centerPosX - halfWidth, centerPosY - halfHeight, 1000)],
        //     'red');
    }

    _frameEnd() {
        if (this.isTargeted) {
            if (this.targetedFrame !== this.game.time.frameCount) {
                this._onUntargeted();
            }
        }
    }
}

module.exports = function(options) {
    return new PlayerComponent(options);
};
