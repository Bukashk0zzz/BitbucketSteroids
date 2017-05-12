const path = require('path');
const webpack = require('webpack');

module.exports = {
    target: 'node',
    entry: './src/app.js',
    output: {
        path: path.resolve(__dirname, "BitbucketSteroids.safariextension"),
        filename: 'main.js'
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ]
};
