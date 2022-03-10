const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        robot: './src/pages/robot/js/robot.ts',
        operator: './src/pages/operator/js/operator.main.ts'
    },
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
        extensions: ['.tsx', '.ts', '.js'],
    },
};