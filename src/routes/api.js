const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

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
 * @route POST /api/create-author
 *
 * Adds a new author into the database
 * @param {string} name - Name of the author
 */
router.post('/create-author', (req, res) => {
  const { name } = req.body
  db.createAuthor(name)

  res.status(200).send('OK')
})

/**
 * @route POST /api/create-collection
 *
 * Adds a new collection into the database
 * @param {string} name
 */
router.post('/create-collection', (req, res) => {
  const { name } = req.body
  db.createCollection(name)

  res.sendStatus(200)
})

router.post('/create-media', (req, res) => {
  const { name } = req.body
  db.createMedia(name)

  res.sendStatus(200)
})

/**
 * @route POST /api/get-song
 *
 * Gets the information for a song
 * @param {string} body.songId
 * @returns {object} 200 - Song information
 */
router.post('/get-song', async (req, res) => {
  await getFromDatabaseById(req, res, 'songs')
})

/**
 * @route POST /api/get-author
 *
 * Gets the information for an author
 * @param {string} body.authorId
 * @returns {object} 200 - Author information
 */
router.post('/get-author', async (req, res) => {
  await getFromDatabaseById(req, res, 'authors')
})

/**
 * @route POST /api/get-collection
 *
 * Gets the information for a collection
 * @param {string} body.collectionId
 * @returns {object} 200 - Collection information
 */
router.post('/get-collection', async (req, res) => {
  await getFromDatabaseById(req, res, 'collections')
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

/**
 * @route POST /api/submit-author
 *
 * Updates the information for an author
 * @param {object} body - Object with author data
 */
router.post('/submit-author', (req, res) => {
  const data = req.body
  db.updateAuthor(data)
  res.status(200).send('OK')
})

/**
 * @route POST /api/submit-collection
 *
 * Updates the information for a collection
 * @param {object} body - Object with collection data
 */
router.post('/submit-collection', (req, res) => {
  const data = req.body
  db.updateCollection(data)
  res.sendStatus(200)
})

const upload = multer({ dest: path.join(__dirname, '../public/music/') })

/**
 * @route POST /api/submit-file
 *
 * Submits a music file to add it to the database
 * @param {} file
 * @param {string} body.songId
 * @param {string} body.collectionId
 */
router.post('/submit-file', upload.single('file'), (req, res) => {
  const { originalname, filename } = req.file
  const { songId, collectionId } = req.body
  db.createFile(songId, collectionId, originalname, filename)
  res.sendStatus(200)
})

/**
 * @route POST /api/get-author-names
 *
 * Gives all the author rows filtered by a keyword
 * @param {object} body.keyword
 * @returns {import('../app/database').Row[]}
 */
router.post('/get-author-names', async (req, res) => {
  const { keyword } = req.body
  const rows = await db.getAuthorNames(keyword)
  res.status(200).send(rows)
})

/**
 * @route POST /api/get-main-names
 *
 * Gives all the song names filtered by a keyword
 * @param {string} body.keyword
 * @returns {import('../app/database').Row[]}
 */
router.post('/get-main-names', async (req, res) => {
  const { keyword } = req.body
  const rows = await db.getSongMainNames(keyword)
  res.status(200).send(rows)
})

/**
 * @route POST /api/get-collection-names
 *
 * Gives all the collection names filtered by a keyword
 * @param {string} body.keyword
 * @returns {import('../app/database').Row[]}
 */
router.post('/get-collection-names', async (req, res) => {
  const { keyword } = req.body
  const rows = await db.getCollectionNames(keyword)
  res.status(200).send(rows)
})

/**
 * @route POST /api/get-file-data
 *
 * Gives all the files for a song
 * @param {string} body.songId
 * @returns {import('../app/database').Row[]} - 200
 */
router.post('/get-file-data', async (req, res) => {
  const { songId } = req.body
  const rows = await db.getFileData(songId)
  res.status(200).send(rows)
})

/**
 * Asynchronously get a data object from the database
 *
 * The request body must contain the row id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} type - Data type to target
 */
async function getFromDatabaseById (req, res, type) {
  const { id } = req.body
  const info = await db.getDataById(type, id)
  if (info) {
    res.status(200).send(info)
  } else {
    res.status(404).send('')
  }
}

module.exports = router
