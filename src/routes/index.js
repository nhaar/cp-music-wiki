const express = require('express')
const router = express.Router()

const path = require('path')

const apiRouter = require('./api')

// homepage
router.get('/', renderPage('Main Page', `
  <a href="lists"> Open lists </a>
  <br>
  <a href="pre-editor"> Go to the editor </a>
`))

// editor selector
router.get('/pre-editor', (req, res) => {
  res.status(200).render('pre-editor.html')
})

// editor
router.get('/editor', (req, res) => {
  res.status(200).render('editor.html')
})

router.get('/lists', renderPage('OST Lists', `
<a href="series-list"> Series OST </a>
`))

router.get('/series-list', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../views/generated/series-ost.html'))
})

router.get('/user-page', renderPage('Login', `
  <input class="name" placeholder="Name">
  <input class="password" placeholder="Pass">
  <button class="send">SEND</button>

  <script src="../scripts/user-page.js" type="module"></script>
`))

// api
router.use('/api', apiRouter)

// default
router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

function renderPage (header, content) {
  return (req, res) => {
    res.status(200).render('page.html', { header, content })
  }
}

module.exports = router
