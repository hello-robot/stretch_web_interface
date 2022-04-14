const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

const pages = ['robot', 'operator'];

module.exports = {
    mode: 'development',
    entry: pages.reduce((config, page) => {
        config[page] = `./src/pages/${page}/ts/index.ts`;
        return config;
    }, {}),
    output: {
        filename: "[name]/main.js",
        path: path.resolve(__dirname, "dist"),
    },
    optimization: {
        splitChunks: {
            chunks: "all",
        },
    },
    plugins: [].concat(
        pages.map(
            (page) =>
                new HtmlWebpackPlugin({
                    inject: true,
                    template: `./src/pages/${page}/${page}.html`,
                    filename: `${page}/index.html`,
                    chunks: [page],
                })
        )
    ),
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: true
                }
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            shared: path.resolve(__dirname, 'src/shared/'),
        }
    },
    watch: true,
};