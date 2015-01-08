'use strict';

module.exports = {
    /**
     * Warp an entity to a given grid position.
     */
    sendWarp: function(toEntity, gridPos) {
        toEntity.sendSignal('warp', gridPos);
    },

    /**
     * Damage a given entity.
     * Info:
     *  amount: the amount of damage
     *  fromEntity: the entity that initiated the damage
     */
    sendDamage: function(toEntity, info) {
        toEntity.sendSignal('damage', info);
    },

    sendTarget: function(toEntity) {
        toEntity.sendSignal('target');
    },

    sendInteract: function(fromEntity, toEntity) {
        toEntity.sendSignal('interact', fromEntity);
    }
};
