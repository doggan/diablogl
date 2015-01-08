'use strict';

// Inherit EventEmitter to allow event listeners to be registered directly to this object.
require('inherits')(NetworkMgr, require('events').EventEmitter);

var _ = require('lodash');

function NetworkMgr () {
    this.socket = null;
    this.sessionId = null;
    this.isConnected = false;
    this.networkObjects = [];
}

NetworkMgr.prototype.registerObject = function(obj) {
    // TODO: duplicate check
    // TODO: type check
    this.networkObjects.push(obj);
};

NetworkMgr.prototype.connect = function(address, port) {
    var uri = 'http://' + address + ':' + port;
    console.log('Connecting to: ' + uri);

    this.socket = io.connect(uri, {
        'reconnection': false
    });

    this.socket.on('connect', this._onConnect.bind(this));
    this.socket.on('connect_error', this._onConnectError.bind(this));
    this.socket.on('disconnect', this._onDisconnect.bind(this));
    this.socket.on('playerJoined', this._onPlayerJoined.bind(this));
    this.socket.on('playerLeft', this._onPlayerLeft.bind(this));

    // this.socket.on('createObject', this._onCreateObject.bind(this));
    this.socket.on('broadcastToOthers', this._onRPC.bind(this));
    this.socket.on('sendTo', this._onRPC.bind(this));
    this.socket.on('broadcastToOthers_object', this._onRPC_object.bind(this));
    this.socket.on('sendTo_object', this._onRPC_object.bind(this));
};

NetworkMgr.prototype._onConnect = function () {
    this.isConnected = true;
    this.sessionId = this.socket.io.engine.id;

    this.emit('connect', true, this.sessionId);
};

NetworkMgr.prototype._onConnectError = function (err) {
    this.emit('connect', false);
};

NetworkMgr.prototype._onDisconnect = function () {
    this.isConnected = false;
    this.sessionId = null;
    this.networkObjects = [];

    this.emit('disconnect');
};

NetworkMgr.prototype._onPlayerJoined = function (data) {
    this.emit('playerJoined', data);
};

NetworkMgr.prototype._onPlayerLeft = function (data) {
    this.emit('playerLeft', data);

    // Remove all objects belonging to this player.
    _.remove(this.networkObjects, function(obj) {
        if (obj.ownerId === data.sessionId) {
            obj.entity.destroy();
            return true;
        }
    });
};

// NetworkMgr.prototype.createObject = function (cb) {
//     if (this.isConnected) {
//         // TODO: will need to store these in LUT so that the correct callback
//         // can be triggered on response
//         this.TEMP_cb = cb;
//
//         this.socket.emit('createObject');
//     }
// };

// NetworkMgr.prototype._onCreateObject = function (data) {
//     this.TEMP_cb(data.id);
// };

NetworkMgr.prototype.broadcastToOthers = function(data) {
    if (this.isConnected) {
        this.socket.emit('broadcastToOthers', data);
    }
};

NetworkMgr.prototype.sendTo = function(data) {
    if (this.isConnected) {
        this.socket.emit('sendTo', data);
    }
};

NetworkMgr.prototype.broadcastToOthers_object = function(data) {
    if (this.isConnected) {
        this.socket.emit('broadcastToOthers_object', data);
    }
};

NetworkMgr.prototype.sendTo_object = function(data) {
    if (this.isConnected) {
        this.socket.emit('sendTo_object', data);
    }
};

NetworkMgr.prototype._onRPC = function(data) {
    var rpc = data.rpc;
    var userData = data.data;
    this.emit(rpc, userData);
};

NetworkMgr.prototype._onRPC_object = function(data) {
    var rpc = data.rpc;
    var objectId = data.objectId;
    var userData = data.data;

    // Trigger the event for the object with the matching objectId.
    for (var i = 0; i < this.networkObjects.length; i++) {
        if (this.networkObjects[i].objectId === objectId) {
            this.networkObjects[i].emit(rpc, userData);
            return;
        }
    }

    console.warn('Unable to invoke RPC [' + rpc + '] for objectId: ' + objectId);
};

// TODO:
/*
isHosting
isInChannel
ping
channelID
hostID

List of players

JoinChannel
CreateChannel
 */

module.exports = NetworkMgr;
