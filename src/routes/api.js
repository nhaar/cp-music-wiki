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
  const song = await db.getSongByName(name)
  if (song) {
    res.status(200).send(song)
  } else {
    res.status(404).send('')
  }
})

/**
 * @route POST /api/submit-data
 *
 * Updates the information for a song
 * @param {object} body - Object with song data
 */
router.post('/submit-data', (req, res) => {
  const data = req.body
  db.updateSong(data)
  res.status(200).send('OK')
})

module.exports = router
