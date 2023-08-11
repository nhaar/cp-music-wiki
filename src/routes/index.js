const express = require('express')
const router = express.Router()

const path = require('path')

const apiRouter = require('./api')

// homepage
router.get('/', (req, res) => {
  const content = `
    <a href="lists"> Open lists </a>
    <br>
    <a href="pre-editor"> Go to the editor </a>
  `
  res.status(200).render('page.html', {
    header: 'Main Page',
    content
  })
})

// editor selector
router.get('/pre-editor', (req, res) => {
  res.status(200).render('pre-editor.html')
})

// editor
router.get('/editor', (req, res) => {
  res.status(200).render('editor.html')
})

router.get('/lists', (req, res) => {
  res.status(200).render('lists.html')
})

router.get('/series-list', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../views/generated/series-ost.html'))
})

router.get('/user-page', (req, res) => {
  res.status(200).render('user-page.html')
})

// api
router.use('/api', apiRouter)

// default
router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

module.exports = router
