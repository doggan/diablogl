'use strict';

var inherits = require('inherits'),
    Component = require('./../core/component');

function FollowCameraComponent (entity) {
    Component.call(this, entity);

    this.camera = entity.game.camera;
}

inherits(FollowCameraComponent, Component);

FollowCameraComponent.prototype.update = function() {
    // TODO: technically should be done in a lateUpdate to prevent camera position from being 1 frame behind
    // (depending on update order)
    this.camera.position.x = this.entity.position.x;
    this.camera.position.y = this.entity.position.y;
};

module.exports = FollowCameraComponent;
