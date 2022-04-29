const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');


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
    plugins: [
        new CleanWebpackPlugin(),
    ].concat(
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
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },{
                test: /\.css$/i,
                type: 'asset/source',
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