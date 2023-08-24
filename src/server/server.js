const express = require('express')
const app = express()

const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')

const config = require('../../webpack.config')
const compiler = webpack(config)

const { port } = require('../../config')

const SERVER_PORT = port

const { createDirectoryIfNotExists } = require('./misc/server-utils')

const path = require('path')
const clsys = require('../server/database/class-system')

createDirectoryIfNotExists(path.join(__dirname, '../client/views/generated'))
createDirectoryIfNotExists(path.join(__dirname, '../client/music'))

app.use(express.json())

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
} else {
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath,
      stats: 'minimal'
    })
  )
  if (process.env.NODE_ENV === 'hot') {
    app.use(require('webpack-hot-middleware')(compiler))
  }
}

// make sure tables are created before running router
clsys.createTables().then(() => {
  app.use('/', require('./routes/index'))
})

app.listen(SERVER_PORT, () => {
  console.log(`Listening on port ${SERVER_PORT}`)
})
