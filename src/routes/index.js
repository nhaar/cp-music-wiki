const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.status(200).render('index.html')
})

router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

module.exports = router
