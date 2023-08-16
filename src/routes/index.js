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
<a href="series-list"> Series OST </a><br>
<a href="flash-list"> Club Penguin (Flash) OST </a><br>
<a href="cpi-list"> Club Penguin Island OST </a><br>
<a href="misc-list"> Misc OST </a><br>
<a href="mobile-list"> Mobile Apps OST </a><br>
<a href="game-day-list"> Club Penguin: Game Day! OST </a><br>
<a href="ds-list"> Club Penguin DS Games OST </a><br>
<a href="penguin-chat-list"> Penguin Chat OST </a><br>
<a href="unused-flash-list"> Unused Club Penguin (Flash) OST </a><br>
`))

function renderList (name) {
  return (req, res) => {
    res.status(200).sendFile(path.join(__dirname, `../views/generated/${name}.html`))
  }
}

router.get('/series-list', renderList('series-ost'))
router.get('/flash-list', renderList('flash-ost'))
router.get('/cpi-list', renderList('cpi-ost'))
router.get('/misc-list', renderList('misc-ost'))
router.get('/mobile-list', renderList('mobile-ost'))
router.get('/game-day-list', renderList('game-day-ost'))
router.get('/ds-list', renderList('ds-ost'))
router.get('/penguin-chat-list', renderList('penguin-chat-ost'))
router.get('/unused-flash-list', renderList('unused-flash-ost'))

router.get('/RecentChanges', renderPage('Recent Changes', `
<div class="size-selector"></div>
<div class="changes"></div>

<script src="scripts/recent-changes.js" type="module"></script>
`, `
<link rel="stylesheet" href="stylesheets/recent-changes.css">
`))

router.get('/Diff', renderPage('Difference between revisions', `
<div class="diff-viewer"></div>
<script src="scripts/diff.js" type="module">console.log('kkkk')</script>
`, `
<link rel="stylesheet" href="stylesheets/diff.css">
`))

router.get('/user-page', renderPage('Login', `
  Write your credentials to sign in
  <br>
  <input class="name" placeholder="Name">
  <br>
  <input type="password" class="password" placeholder="Password">
  <br>
  <button class="send">SEND</button>

  <script src="scripts/user-page.js" type="module"></script>
`))

// api
router.use('/api', apiRouter)

// default
router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

function renderPage (header, content, extrahead) {
  return (req, res) => {
    console.log(content)
    res.status(200).render('page.html', { header, content, extrahead })
  }
}

module.exports = router
