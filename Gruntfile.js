module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            build: {
                src: './index.js',
                dest: './client/index.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
};
