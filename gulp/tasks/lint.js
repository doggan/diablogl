var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var config = require('../config');
var reporter = require('jshint-stylish');
var map = require('map-stream');
var path = require('path');
var events = require('events');
var emmitter = new events.EventEmitter();

var notify = require("gulp-notify");

var errorReporter = function(file, cb) {
    return map(function(file, cb) {
        if (!file.jshint.success) {
            file.jshint.results.forEach(function(err) {
                if (err) {
                    var msg = [
                        path.basename(file.path),
                        'Line: ' + err.error.line,
                        'Reason: ' + err.error.reason
                    ];

                    emmitter.emit('error', new Error(msg.join('\n')));
                }
            });

            gutil.beep();
        }
        cb(null, file);

    });
};

gulp.task('lint', function() {
    return gulp.src(config.lint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(reporter))
        .pipe(errorReporter())
        .on('error', notify.onError(function(err) {
            return err.message;
        }));
});
