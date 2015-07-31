let fs = require('graceful-fs'),    // Using this to handle exceptions when trying to write too many files at once.
    async = require('async'),
    PNG = require('node-png').PNG,
    DFormats = require('diablo-file-formats'),
    Level = require('../lib/level'),
    util = require('../lib/util'),
    mpqtools = require('../node_modules/mech-mpq/build/Release/mpqtools'),
    TexturePacker = require('../lib/texture_packer');

let MPQ_PATH = '/Users/shyam/Documents/_devData/DIABDAT.MPQ';

let mpqArchive;

try {
    mpqArchive = mpqtools.openArchive(MPQ_PATH);
}
catch (err) {
    console.error(err);
    console.error('Unable to open MPQ archive: ' + MPQ_PATH);

    process.exit(1);
}

function doReadFile(filePath, cb) {
    let origFilePath = filePath;
    filePath = filePath.replace(/\//g, '\\');
    let file = mpqArchive.openFile(filePath);
    let fileContents = file.readFile();
    file.closeFile();

    if (!Buffer.isBuffer(fileContents)) {
        fileContents = new Buffer(fileContents);
    }

    cb(fileContents, origFilePath);
}

let pal;
let cel;
let min;
let til;
let duns = [];
let sol;
let cl2;

doReadFile('levels/towndata/town.pal', function(buffer, path) {
    pal = DFormats.Pal.load(buffer, path);
});
// doReadFile('levels/towndata/town.cel', function(buffer, path) {
//     cel = DFormats.Cel.load(buffer, path);
// });
// doReadFile('levels/towndata/town.min', function(buffer, path) {
//     min = DFormats.Min.load(buffer, path);
// });
// doReadFile('levels/towndata/town.til', function(buffer, path) {
//     til = DFormats.Til.load(buffer, path);
// });
// doReadFile('levels/towndata/sector1s.dun', function(buffer, path) {
//     duns[0] = DFormats.Dun.load(buffer, path, til);
// });
// doReadFile('levels/towndata/town.sol', function(buffer, path) {
//     sol = DFormats.Sol.load(buffer, path);
// });
// doReadFile('levels/l1data/l1.pal', function(buffer, path) {
//     pal = DFormats.Pal.load(buffer, path);
// });
// doReadFile('levels/l1data/l1.cel', function(buffer, path) {
//     cel = DFormats.Cel.load(buffer, path);
// });
// doReadFile('levels/l1data/l1.min', function(buffer, path) {
//     min = DFormats.Min.load(buffer, path);
// });
// doReadFile('levels/l1data/l1.til', function(buffer, path) {
//     til = DFormats.Til.load(buffer, path);
// });
// doReadFile('levels/l2data/bonestr2.dun', function(buffer, path) {
//     duns[0] = DFormats.Dun.load(buffer, path, til);
// });
doReadFile('plrgfx/warrior/wls/wlsat.cl2', function(buffer, path) {
    cl2 = DFormats.Cl2.load(buffer, path);
});


/*
async.series([
    function(cb) {
        let path = 'levels/towndata/town.pal';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            pal = DFormats.Pal.load(buffer, path);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/town.cel';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            cel = DFormats.Cel.load(buffer, path);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/town.min';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            min = DFormats.Min.load(buffer, path);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/town.til';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            til = DFormats.Til.load(buffer, path);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/sector1s.dun';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            duns[0] = DFormats.Dun.load(buffer, path, til);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/sector2s.dun';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            duns[1] = DFormats.Dun.load(buffer, path, til);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/sector3s.dun';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            duns[2] = DFormats.Dun.load(buffer, path, til);
            cb();
        });
    },
    function(cb) {
        let path = 'levels/towndata/sector4s.dun';
        util.requestReadFile(path, function(err, res, buffer) {
            if (err) { return cb(err); }
            duns[3] = DFormats.Dun.load(buffer, path, til);
            cb();
        });
    },
    function(cb) {
        doWork();
        cb();
    }
], function(err, results) {
    if (err) { console.error(err);}
});*/

let BLOCK_HEIGHT = 32;
let HALF_BLOCK_HEIGHT = BLOCK_HEIGHT / 2;
let BLOCK_WIDTH = 32;

let testUtil = require('./util');

doWork();

function doWork() {
    doCL2();
    // doDUN();
    // doTIL();
}

function doPackAnimation(animInfos, packedFrames, decodedImages, prefix) {
    for (let i = 0; i < decodedImages.length; i++) {
        animInfos.push({
            name: prefix + i,
            frameCount: decodedImages[i].length
        });
        packedFrames = packedFrames.concat(decodedImages[i]);
    }

    return packedFrames;
}

function doCL2() {
    let animInfos = [];
    let packedFrames = [];
    packedFrames = doPackAnimation(animInfos, packedFrames, cl2.decodeFrames(pal), 'idle_');

    let AnimController = require('./../lib/anim_controller');
    let animController = new AnimController();
    animController.load(animInfos, packedFrames);
    animController.play('idle_0');

    // Create png for each texture atlas...
    for (let i = 0; i < animController.texturePacker.materials.length; i++) {
        let texture = animController.texturePacker.materials[i].map.image;

        let png = new PNG({
            width: texture.width,
            height: texture.height,
            filterType: -1
        });

        // Copy texture to png.
        for (let j = 0; j < texture.data.length; j++) {
            png.data[j] = texture.data[j];
        }

        let path = './test/textures/packedData/atlas' + i + '.png';
        console.log('Writing: ' + path + ', ' + png.width + 'x' + png.height);
        png.pack().pipe(fs.createWriteStream(path));
    }

    // let decodedImages = cl2.decodeFrames(pal);
    // for (let i = 0; i < decodedImages.length; i++) {
    //     let decodedFrames = decodedImages[i];
    //     for (let j = 0; j < decodedFrames.length; j++) {
    //         testUtil.writeCelFrameToPNG('./test/textures/frameDataCl2/' + i + '_' + j + '.png', decodedFrames[j], false);
    //     }
    // }
}

function doTexturePacker() {
    let width = 1024;
    let height = 1024;
    let texturePacker = TexturePacker.generate(width, height, decodedFrames);

    // Create png for each texture atlas...
    for (let i = 0; i < texturePacker.materials.length; i++) {
        let texture = texturePacker.materials[i].map.image;

        let png = new PNG({
            width: texture.width,
            height: texture.height,
            filterType: -1
        });

        // Copy texture to png.
        for (let j = 0; j < texture.data.length; j++) {
            png.data[j] = texture.data[j];
        }

        let path = './test/textures/packedData/atlas' + i + '.png';
        console.log('Writing: ' + path + ', ' + png.width + 'x' + png.height);
        png.pack().pipe(fs.createWriteStream(path));
    }
}

function doLevel() {
    // Level rendering.
    let level = Level.load(duns);

    let width = level.colCount * BLOCK_WIDTH + level.rowCount * BLOCK_WIDTH;
    let height = level.colCount * (BLOCK_HEIGHT / 2) + level.rowCount * (BLOCK_HEIGHT / 2) + (getPillarHeight(min.pillars[0]) - BLOCK_HEIGHT);

    let png = new PNG({
        width: width,
        height: height,
        filterType: -1
    });

    doLevel(level, min, decodedFrames, width, png);

    let path = './test/textures/levelData/town.png';
    console.log('Writing: ' + path);
    png.pack().pipe(fs.createWriteStream(path));
}

function doDUN() {
    let decodedFrames = cel.decodeFrames(pal);

    // DUN rendering.
    for (let i = 0; i < duns.length; i++) {
        let dun = duns[i];
        let width = dun.colCount * BLOCK_WIDTH + dun.rowCount * BLOCK_WIDTH;
        let height = dun.colCount * (BLOCK_HEIGHT / 2) + dun.rowCount * (BLOCK_HEIGHT / 2) + (testUtil.getPillarHeight(min.pillars[0]) - BLOCK_HEIGHT);

        let png = new PNG({
            width: width,
            height: height,
            filterType: -1
        });

        testUtil.doDungeon(dun, min, decodedFrames, width, png);

        let path = './test/textures/dunData/' + dun.fileName + '.png';
        console.log('Writing: ' + path);
        png.pack().pipe(fs.createWriteStream(path));
    }
}

function doTIL() {
    let decodedFrames = cel.decodeFrames(pal);

    // TIL rendering.
    let width = testUtil.getPillarWidth() * 2;
    let height = testUtil.getPillarHeight(min.pillars[0]) + BLOCK_HEIGHT;

    // let squareIndex = 219;

    for (let i = 0; i < til.squares.length; i++) {

    let squareIndex = i;
    let square = til.squares[squareIndex];

    let png = new PNG({
        width: width,
        height: height,
        filterType: -1
    });

    testUtil.doSquare(square, min, decodedFrames, testUtil.getPillarWidth(), png);

    let path = './test/textures/tilData/' + squareIndex + '.png';
    console.log('Writing: ' + path);
    png.pack().pipe(fs.createWriteStream(path));

    }
}

function doMIN() {
    // MIN rendering.
    let pillarIndex = 925;    // house roof

    // for (let i = 0; i < min.pillars.length; i++) {
    // let pillarIndex = i;

    let path = './test/textures/minData/' + pillarIndex + '.png';
    let pillarBlocks = min.pillars[pillarIndex];

    let png = new PNG({
        width: getPillarWidth(),
        height: getPillarHeight(pillarBlocks),
        filterType: -1
    });

    doPillar(pillarBlocks, decodedFrames, png);

    console.log('Writing: ' + path);
    png.pack().pipe(fs.createWriteStream(path));

    // }
}

function doCEL() {
    let decodedFrames = cel.decodeFrames(pal);

    for (let i = 0; i < decodedFrames.length; i++) {
        writeCelFrameToPNG('./test/textures/frameData/' + i + '.png', decodedFrames[i], true);
    }
}
