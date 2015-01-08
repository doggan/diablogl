'use strict';

/**
 * Base class for all components.
 */
function Component (entity, params) {
    this.entity = entity;

    params = params || {};

    // Allow derived components to disable update call.
    this.requireUpdate = (typeof params.requireUpdate === 'undefined') ? true : params.requireUpdate;

    // Allow callbacks and other logic to be setup from outside of the component.
    // Allows easier re-use of components.
    this.onStart = null;
}

Component.prototype.startImpl = function () {
    this.start();

    if (this.onStart) {
        this.onStart();
    }
};

Component.prototype.start = function () {

};

Component.prototype.destroy = function() {

};

Component.prototype.update = function() {

};

module.exports = Component;
