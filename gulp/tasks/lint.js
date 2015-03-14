var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var config = require('../config');
var reporter = require('jshint-stylish');
var map = require('map-stream');

var errorReporter = map(function(file, cb) {
    if (!file.jshint.success) {
        gutil.beep();
    }
    cb(null, file);
});

gulp.task('lint', function() {
    return gulp.src(config.lint.src)
        .pipe(jshint())
        .pipe(jshint.reporter(reporter))
        .pipe(errorReporter);
});
