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

/**
 * @route POST /api/get-song
 *
 * Gets the information for a song
 * @param {string} name - Name of the song to find
 * @returns {object} 200 - Song information
 */
router.post('/get-song', async (req, res) => {
  const { name } = req.body
  const song = await db.getSong(name)
  if (song) {
    res.status(200).send(song)
  } else {
    res.status(404).send('')
  }
})

module.exports = router
