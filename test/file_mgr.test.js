// Prevent chai syntax from causing JSLint errors.
/*jshint expr: true*/

let expect = require('chai').expect,
    FileMgr = require('./../lib/core/file_mgr');

let LoadUnit = {
    UNIT_1: 0,
    UNIT_2: 1
};

describe('file_mgr', function(){
    afterEach(function(done){
        // Cleanup.
        FileMgr.unloadAllFiles();

        done();
    });

    it('should load and allow access to existing files', function (done) {
        let paths = [
            'levels/towndata/town.pal'
        ];

        FileMgr.loadFiles(LoadUnit.UNIT_1, paths, function() {
            expect(FileMgr.getFile(paths[0])).to.exist;

            let badPath = 'hoge/hoge/hoge.pal';
            expect(FileMgr.getFile(badPath)).to.not.exist;

            done();
        });
    });

    it('should load and unload files from the correct LoadUnit', function (done) {
        let loadUnit1Paths = [
            'levels/towndata/town.pal'
        ];
        let loadUnit2Paths = [
            'levels/towndata/town.min'
        ];

        FileMgr.loadFiles(LoadUnit.UNIT_1, loadUnit1Paths, function() {
            FileMgr.loadFiles(LoadUnit.UNIT_2, loadUnit2Paths, function() {
                expect(FileMgr.getFile(loadUnit1Paths[0])).to.exist;
                expect(FileMgr.getFile(loadUnit2Paths[0])).to.exist;

                FileMgr.unloadFiles(LoadUnit.UNIT_1);
                expect(FileMgr.getFile(loadUnit1Paths[0])).to.not.exist;
                expect(FileMgr.getFile(loadUnit2Paths[0])).to.exist;

                FileMgr.unloadFiles(LoadUnit.UNIT_2);
                expect(FileMgr.getFile(loadUnit1Paths[0])).to.not.exist;
                expect(FileMgr.getFile(loadUnit2Paths[0])).to.not.exist;

                done();
            });
        });
    });
});
