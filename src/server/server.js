const path = require('path')

// express setup
const express = require('express')
const app = express()

// webpack setup
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const config = require('../../webpack.config')
const compiler = webpack(config);

// initialize directories
[
  '../client/music',
  '../client/scripts/auto'
].forEach(dir => require('./misc/server-utils').createDirectoryIfNotExists(path.join(__dirname, dir)))

// all requests are handled with JSON
app.use(express.json())

// generate html files
require('./auto/generate-auto')

// setup static/public files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
} else {
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath,
      stats: 'minimal'
    }))
  // `hot` enables auto-refresh, but it causes load issues if you switch pages too much
  if (process.env.NODE_ENV === 'hot') {
    app.use(require('webpack-hot-middleware')(compiler))
  }
}

// make sure tables are created before running router
require('./item-class/item-class-database').initDatabase().then(() => {
  app.use('/', require('./routes/index'))
})

// run on custom or environment port
const SERVER_PORT = process.env.PORT || require('../../config').PORT
app.listen(SERVER_PORT, () => {
  console.log(`Listening on port ${SERVER_PORT}`)
})
