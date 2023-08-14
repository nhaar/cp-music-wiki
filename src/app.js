const nunjucks = require('nunjucks')
const express = require('express')
const app = express()

const config = require('../config')

const SERVER_PORT = config.port

const indexRouter = require('./routes/index')
const { createDirectoryIfNotExists } = require('./app/utils')

const path = require('path')

createDirectoryIfNotExists(path.join(__dirname, 'views/generated'))
createDirectoryIfNotExists(path.join(__dirname, 'public/music'))

nunjucks.configure('src/views', {
  autoescape: true,
  express: app
})

app.use(express.static('src/public'))
app.use(express.json())
app.use('/', indexRouter)

app.listen(SERVER_PORT, () => {
  console.log(`Listening on port ${SERVER_PORT}`)
})
