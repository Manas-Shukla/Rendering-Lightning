const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = {
    resolve: {
        extensions: ['.js'],
        modules: [path.resolve(__dirname, 'src'), 'node_modules']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            publicPath: '/data/'
                        }
                    }
                ]
            },
            {
                test: /\.html$/,
                use: [
                    {
                        loader: "html-loader"
                    }
                ]
            }
        ]
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: "./src/index.html",
            filename: "./index.html"
        })
    ],

    devtool: 'cheap-module-eval-source-map'
};