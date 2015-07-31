'use strict';

let inherits = require('inherits'),
    Component = require('./../core/component');

function NetworkComponent(entity) {
    Component.call(this, entity, {
        requireUpdate: false
    });

    this.networkMgr = entity.game.networkMgr;
    this.isMine = true;
    this.objectId = -1;
    this.ownerId = -1;

    this.networkMgr.registerObject(this);
}

inherits(NetworkComponent, Component);

module.exports = NetworkComponent;
