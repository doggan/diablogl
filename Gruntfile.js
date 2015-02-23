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

    grunt.registerTask('build', ['browserify']);
    grunt.registerTask('dev', function(n) {
        grunt.config.set('browserify.options.watch', true);
        grunt.config.set('browserify.options.keepAlive', true);
        return grunt.task.run(['browserify']);
    });
};
