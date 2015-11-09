// Prevent chai syntax from causing JSLint errors.
/*jshint expr: true*/

let expect = require('chai').expect,
    util = require('../lib/util');

describe('main', function(){
    describe('GET - /mpq_files/:filename', function(){
        it('should return the requested binary file', function(done){
            let path = 'levels\\towndata\\town.pal';
            util.requestReadFile(path, function(err, res, buffer) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers, null, '\t'));

                expect(err).to.not.exist;
                expect(res.statusCode).to.equal(200);

                expect(buffer.length).to.equal(256 * 3);

                done();
            });
        });
    });
});
