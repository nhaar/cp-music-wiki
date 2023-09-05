const path = require('path')
const webpack = require('webpack')
const exec = require('child_process').exec

/**
 * Class that handles the creation of the `module.exports` required for webpack to function
 */
class WebpackSetup {
  /**
   * @param  {...string} names - The list of the names of the javascript files that will entry points for a bundle
   */
  constructor (...names) {
    Object.assign(this, { names })

    /** This plugin is used to make sure the linter runs after each update of the hot module replacement plugin */
    this.lintPlugin = {
      apply: compiler => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
          exec('npx standard --fix', (err, stdout) => {
            if (err) {
              console.log('====================== LINT ERRORS ======================')
              process.stdout.write(stdout)
              console.log('=========================================================')
            } else console.log('############## NO LINT ERRORS #################')
          })
        })
      }
    }
  }

  /**
   * Get the entry property for all of the entry point javascript files
   * @returns {object} The entry property object
   */
  getEntry () {
    const entry = {}
    this.names.forEach(name => {
      entry[name] = ['webpack-hot-middleware/client?reload=true', path.join(__dirname, `src/client/scripts/auto/${name}.js`)]
    })
    return entry
  }

  /**
   * Get the `module.exports` for the webpack configuration
   * @returns {object} The object for the exports
   */
  getExports () {
    // apart from a few, most of this is just the standard webpack configuration
    return {
      mode: 'development',
      entry: this.getEntry(),
      module: {
        rules: [
          {
            test: /(\.js$)|(\.jsx$)/,
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
        filename: '[name].bundle.js',
        publicPath: '/'
      },
      devtool: 'inline-source-map',
      plugins: [
        new webpack.HotModuleReplacementPlugin(),
        this.lintPlugin
      ]
    }
  }
}

module.exports = (new WebpackSetup(...require('./src/server/auto/hashed-list'))).getExports()
