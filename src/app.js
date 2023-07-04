const nunjucks = require('nunjucks')
const express = require('express')
const app = express()

const indexRouter = require('./routes/index')

const SERVER_PORT = 5000

nunjucks.configure('src/views', {
  autoescape: true,
  express: app
})

app.use(express.static('src/public'))

app.use('/', indexRouter)

app.listen(SERVER_PORT, () => {
  console.log(`Listening on port ${SERVER_PORT}`)
})
