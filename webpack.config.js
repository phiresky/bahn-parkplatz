var webpack = require("webpack");

module.exports = {
	entry: ['./main.tsx'],
	devtool: "cheap-module-source-map",
	output: {
		filename: 'bin/bundle.js'
	},
	resolve: {
		extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js']
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				'NODE_ENV': JSON.stringify('production')
			}
		})
	],
    devtool: 'source-map',
	module: {
		loaders: [
			{ test: /\.tsx?$/, loader: 'awesome-typescript-loader' }
		]
	}
}