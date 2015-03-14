var gulp = require('gulp');
var jshint = require('gulp-jshint');
var config = require('../config');
var stylish = require('jshint-stylish');

gulp.task('lint', function() {
    return gulp.src(config.lint.src)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});
