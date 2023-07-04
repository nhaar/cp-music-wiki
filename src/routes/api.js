const express = require('express')
const router = express.Router()

const db = require('../app/database')

/**
 * @route POST /api/create-song
 *
 * Adds a new song into the database
 * @param {string} name - Name of the song
 */
router.post('/create-song', (req, res) => {
  const { name } = req.body
  db.createSong(name)

  res.status(200).send('OK')
})

module.exports = router
