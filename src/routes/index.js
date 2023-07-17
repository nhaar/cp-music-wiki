const express = require('express')
const router = express.Router()

const path = require('path')

const apiRouter = require('./api')

/**
 * @route GET /
 *
 * Renders the homepage
 */
router.get('/', (req, res) => {
  res.status(200).render('index.html')
})

/**
 * @route GET /pre-editor
 *
 * Renders the editor menu page
 */
router.get('/pre-editor', (req, res) => {
  res.status(200).render('pre-editor.html')
})

/**
 * @route GET /lists
 *
 * Renders the lists page
 */
router.get('/lists', (req, res) => {
  res.status(200).render('lists.html')
})

/**
 * @route GET /series-lists
 *
 * Renders the series list
 */
router.get('/series-list', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../views/generated/series-list.html'))
})

/**
 * @route GET /editor
 *
 * Renders the editor page
 */
router.get('/editor', (req, res) => {
  res.status(200).render('editor.html')
})

router.use('/api', apiRouter)

router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

module.exports = router
