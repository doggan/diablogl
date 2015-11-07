'use strict';

class Player {
    constructor(parentGroup) {
        this._sprite = parentGroup.create(0, 0, 'characters/skeleton');
        this._sprite.anchor.set(0.5, 0.75);

        const ANIM_NAME = 'idle';

        const FRAME_RATE = 10;
        const LOOP = true;
        const USE_NUMERIC_INDEX = false;
        const ZERO_PAD = 3;
        for (let i = 0; i < 8; i++) {
            let directionString = ANIM_NAME + '/' + i;
            let frameNames = Phaser.Animation.generateFrameNames(
                directionString + '/', 0, 9, '', ZERO_PAD);
            let reverseFrameNames = frameNames.slice(1, -1);
            reverseFrameNames.reverse();
            frameNames = frameNames.concat(reverseFrameNames);
            this._sprite.animations.add(
                directionString,
                frameNames,
                FRAME_RATE, LOOP, USE_NUMERIC_INDEX);
        }

        this._sprite.animations.play(ANIM_NAME + '/0');
    }

    get sprite() {
        return this._sprite;
    }

    update(dt, cursors) {
        let speed = 250;
        if (cursors.up.isDown) {
            this.sprite.y -= speed * dt;
        } else if (cursors.down.isDown) {
            this.sprite.y += speed * dt;
        }
        if (cursors.left.isDown) {
            this.sprite.x -= speed * dt;
        } else if (cursors.right.isDown) {
            this.sprite.x += speed * dt;
        }
    }
}

exports.Player = Player;
