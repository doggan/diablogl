let App = require('../app');

class FollowCameraComponent {
    start() {
        this.gameObjectComponent = this.entity.getComponent('PlayerComponent');
    }

    update() {
        // TODO: technically should be done in a lateUpdate to prevent camera position from being 1 frame behind
        // (depending on update order)
        App.activeCamera.position.x = this.gameObjectComponent.position.x;
        App.activeCamera.position.y = this.gameObjectComponent.position.y;
    }
}

module.exports = function() {
    return new FollowCameraComponent();
}
