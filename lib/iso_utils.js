'use strict';

const FACING_DIRECTIONS = {
    INVALID: -1,

    SOUTH: 0,
    SOUTHWEST: 1,
    WEST: 2,
    NORTHWEST: 3,
    NORTH: 4,
    NORTHEAST: 5,
    EAST: 6,
    SOUTHEAST: 7,
};

/**
 * Get the facing direction to move from fromPos to toPos.
 * @param  {number[]} fromPos The starting position.
 * @param  {number[]} toPos   The end position.
 * @return {FACING_DIRECTIONS}         The direction identifier.
 */
function getFacingDirection(fromPos, toPos) {
    var dx = toPos[0] - fromPos[0];
    var dy = toPos[1] - fromPos[1];

    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));

    if (dx === 0) {
        switch (dy) {
            case 1: return FACING_DIRECTIONS.SOUTHWEST;
            case -1: return FACING_DIRECTIONS.NORTHEAST;
        }
    } else if (dx === 1) {
        switch (dy) {
            case 1: return FACING_DIRECTIONS.SOUTH;
            case 0: return FACING_DIRECTIONS.SOUTHEAST;
            default: return FACING_DIRECTIONS.EAST;
        }
    } else {
        switch (dy) {
            case 1: return FACING_DIRECTIONS.WEST;
            case 0: return FACING_DIRECTIONS.NORTHWEST;
            default: return FACING_DIRECTIONS.NORTH;
        }
    }

    return FACING_DIRECTIONS.INVALID;
}

exports.FACING_DIRECTIONS = FACING_DIRECTIONS;
exports.getFacingDirection = getFacingDirection;
