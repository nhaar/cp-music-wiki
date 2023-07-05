const express = require('express')
const router = express.Router()

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
 * @route GET /creator
 *
 * Renders the creator page
 */
router.get('/creator', (req, res) => {
  res.status(200).render('creator.html')
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
