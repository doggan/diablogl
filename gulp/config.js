module.exports = {
    browserSync: {
        server: {
            // Serve up our build folder
            baseDir: './client'
        }
    },
    browserify: {
        // A separate bundle will be generated for each
        // bundle config in the list below
        bundleConfigs: [{
            entries: './lib/index.js',
            dest: './client',
            outputName: 'index.js',
            // list of externally available modules to exclude from the bundle
            external: []
        }]
    },
    lint: {
        src: "./lib/**/*.js"
    }
};
