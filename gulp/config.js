var dest = "./client";
var src = '.';

module.exports = {
    browserSync: {
        server: {
            // Serve up our build folder
            baseDir: dest
        }
    },
    browserify: {
        // A separate bundle will be generated for each
        // bundle config in the list below
        bundleConfigs: [{
            entries: src + '/index.js',
            dest: dest,
            outputName: 'index.js',
            // list of externally available modules to exclude from the bundle
            external: []
            // external: ['jquery', 'underscore']
        }]
    }
};
