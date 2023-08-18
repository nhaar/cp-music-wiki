const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const exec = require('child_process').exec

module.exports = {
  mode: 'development',
  entry: {
    main: ['webpack-hot-middleware/client?reload=true', path.join(__dirname, 'src/client/scripts/page.js')]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader'
          }
        ]
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx']
  },
  output: {
    path: path.join(__dirname, 'src/client/dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src/client/views/temp.html'),
      filename: 'page.html'
    }),
    new webpack.HotModuleReplacementPlugin(),
    {
      apply: compiler => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', compilation => {
          exec('npx standard --fix', (err, stdout, stderr) => {
            if (stdout) process.stdout.write(stdout)
            if (stderr) process.stderr.write(stderr)
          })
        })
      }
    }
  ]
}
