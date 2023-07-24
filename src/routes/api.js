const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

// const db = require('../app/database')
const pg = require('../app/test')
// const gen = require('../app/lists')

router.post('/update', async (req, res) => {
  const { info, type } = req.body
  const { data } = info
  if (!info) res.status(400).send('No data was found')
  const validationErrors = pg.validate(type, data)
  if (validationErrors.length === 0) {

    await pg.updateType(type, info)
    res.sendStatus(200)
  } else {
    res.status(400).send( { errors: validationErrors })
  }
})

const upload = multer({ dest: path.join(__dirname, '../public/music/') })

/**
 * @route POST /api/submit-file
 *
 * Submits a music file to add it to the database
 * @param {} file
 * @param {string} body.songId
 * @param {string} body.sourceId
 */
router.post('/submit-file', upload.single('file'), async (req, res) => {
  let originalname
  let filename
  if (req.file) ({ originalname, filename } = req.file)
  else ({ originalname, filename } = req.body)
  const { source, sourceLink, isHQ } = req.body
  let { id } = req.body
  if (id === 'undefined') id = null
  const info = {
    id,
    data: { source, originalname, filename, sourceLink, isHQ: Boolean(isHQ) }
  }
  
  console.log(info)
  await pg.updateType('file', info)
  res.sendStatus(200)
})

router.post('/get', async (req, res) => {
  const { type, id } = req.body
  const response = await pg.getDataById(type, id)

  res.status(200).send(response)
})

router.post('/default', async (req, res) => {
  const { type, id } = req.body
  const response = await pg.getDefault(type, id)

  res.status(200).send(response)
})

/**
 * @route POST /api/get-by-name
 *
 * Gives all the rows of a table filtered by a keyword
 * @param {object} body.keyword
 * @param {object} body.table
 * @returns {import('../app/database').Row[]}
 */
router.post('/get-by-name', async (req, res) => {
  const { keyword, type } = req.body
  const results = await pg.getByName(type, keyword)
  res.status(200).send(results)
})

router.post('/get-in-media', async (req, res) => {
  const { keyword, mediaId } = req.body
  const rows = await db.getFeatureInMedia(keyword, mediaId)
  res.status(200).send(rows)
})

router.post('/get-name', async (req, res) => {
  const { type, id } = req.body
  const name = await pg.getQueryNameById(type, id)
  res.status(200).send({ name })
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

module.exports = router
