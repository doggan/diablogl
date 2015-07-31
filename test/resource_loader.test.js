// Prevent chai syntax from causing JSLint errors.
/*jshint expr: true*/

GLOBAL.THREE = require('three');

let expect = require('chai').expect,
    ResourceLoader = require('./../lib/resource_loader'),
    SpriteMgr = require('./../lib/core/sprite_mgr');

describe('resource_loader', function() {
    it('should load common resources', function (done) {
        ResourceLoader.loadCommon(function() {
            expect(SpriteMgr.getSprite('wlsas_0')).to.exist;

            ResourceLoader.unloadCommon();
            expect(SpriteMgr.getSprite('wlsas_0')).to.not.exist;

            done();
        });
    });

    it.only('should load level resources', function (done) {
        ResourceLoader.loadCommon(function() {
            ResourceLoader.loadLevel(0, function() {
                expect(SpriteMgr.getSprite('town')).to.exist;

                ResourceLoader.unloadActiveLevel();
                expect(SpriteMgr.getSprite('town')).to.not.exist;

                // Attempt to reload...
                ResourceLoader.loadLevel(0, function() {
                    expect(SpriteMgr.getSprite('town')).to.exist;

                    ResourceLoader.unloadActiveLevel();
                    expect(SpriteMgr.getSprite('town')).to.not.exist;

                    ResourceLoader.unloadCommon();

                    done();
                });
            });
        });
    });
});
