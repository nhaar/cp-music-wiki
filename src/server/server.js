const express = require('express')
const app = express()

const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')

const config = require('../../webpack.config')
const compiler = webpack(config)

const { port } = require('../../config')

const SERVER_PORT = port

const indexRouter = require('./routes/index')
const { createDirectoryIfNotExists } = require('./misc/utils')

const path = require('path')

createDirectoryIfNotExists(path.join(__dirname, '../client/views/generated'))
createDirectoryIfNotExists(path.join(__dirname, '../client/music'))

app.use(express.json())

app.use(express.static(path.join(__dirname, '../client/dist')))

app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath
  })
)

app.use(require('webpack-hot-middleware')(compiler))

app.use('/', indexRouter)

app.listen(SERVER_PORT, () => {
  console.log(`Listening on port ${SERVER_PORT}`)
})
