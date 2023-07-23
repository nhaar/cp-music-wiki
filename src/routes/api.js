const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

// const db = require('../app/database')
const pg = require('../app/test')
// const gen = require('../app/lists')

router.post('/update', async (req, res) => {
  const { info, type } = req.body
  console.log(info)
  await pg.updateType(type, info)
  // gen.updateLists()

  res.sendStatus(200)
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
  const { songId, sourceId, fileId, sourceLink, isHQ } = req.body
  const data = { fileId, meta: { songId }, sourceId, originalname, filename, sourceLink, isHQ: Boolean(isHQ) }
  await db.updateFile(data)
  gen.updateLists()
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

  console.log(response)
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
  const { keyword, table } = req.body
  const rows = await db.getByKeyword(table, keyword)
  res.status(200).send(rows)
})

router.post('/get-in-media', async (req, res) => {
  const { keyword, mediaId } = req.body
  const rows = await db.getFeatureInMedia(keyword, mediaId)
  res.status(200).send(rows)
})

router.post('/get-name', async (req, res) => {
  const { table, id } = req.body
  const name = await db.getNameFromId(table, id)
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
