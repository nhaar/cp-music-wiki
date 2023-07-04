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
 * @route GET /song
 *
 * Renders the page for a song
 */
router.get('/song', (req, res) => {
  res.status(200).render('song.html')
})

router.use('/api', apiRouter)

router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

module.exports = router
