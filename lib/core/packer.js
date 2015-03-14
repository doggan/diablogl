'use strict';

function Packer(w, h) {
    this.root = {
        x: 0,
        y: 0,
        w: w,
        h: h
    };
    this.usedSize = {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0
    };
}

Packer.prototype = {

    /**
     * Attempt to fit a block of a certian width/height (block.w, block.h)
     * into the current packer. Returns true if successful, or false
     * if there is no room for this block.
     *
     * If successful, the block will have a newly added block.x and block.y
     * field that describes it's position within the packer.
     */
    fit: function(block) {
        var node = this._findNode(this.root, block.w, block.h);
        if (node) {
            node = this._splitNode(node, block.w, block.h);
            block.x = node.x;
            block.y = node.y;
            return true;
        }

        // Unable to fit.
        return false;
    },

    _findNode: function(root, w, h) {
        if (root.used) {
            return this._findNode(root.right, w, h) || this._findNode(root.down, w, h);
        } else if ((w <= root.w) && (h <= root.h)) {
            return root;
        } else {
            return null;
        }
    },

    _splitNode: function(node, w, h) {
        node.used = true;
        node.down = {
            x: node.x,
            y: node.y + h,
            w: node.w,
            h: node.h - h
        };
        node.right = {
            x: node.x + w,
            y: node.y,
            w: node.w - w,
            h: h
        };

        // Keep track of the maximum used boundary.
        this.usedSize.maxX = Math.max(this.usedSize.maxX, node.x + w);
        this.usedSize.maxY = Math.max(this.usedSize.maxY, node.y + h);

        return node;
    }

};

module.exports = Packer;
