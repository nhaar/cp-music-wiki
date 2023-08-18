const nunjucks = require('nunjucks')
const express = require('express')
const app = express()

const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')

const config = require('../webpack.config.js')
const compiler = webpack(config)

const { port } = require('../config')

const SERVER_PORT = port

const indexRouter = require('./routes/index')
const { createDirectoryIfNotExists } = require('./app/utils')

const path = require('path')

createDirectoryIfNotExists(path.join(__dirname, 'views/generated'))
createDirectoryIfNotExists(path.join(__dirname, 'public/music'))

nunjucks.configure('src/views', {
  autoescape: true,
  express: app
})

app.use(express.json())

app.use(express.static(path.join(__dirname, './public/dist')))
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath
  })
)

console.log(config.output.publicPath)

app.use('/', indexRouter)

app.listen(SERVER_PORT, () => {
  console.log(`Listening on port ${SERVER_PORT}`)
})
