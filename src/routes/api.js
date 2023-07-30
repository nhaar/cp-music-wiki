const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

const db = require('../app/database')

// get default data
router.post('/default', async (req, res) => {
  const { type } = req.body

  if (checkType(res, type)) {
    const row = await db.getDefault(type)
    res.status(200).send(row)
  }
})

// get a data row
router.post('/get', async (req, res) => {
  const { type, id } = req.body

  if (checkType(res, type) && checkId(res, id)) {
    const row = await db.getDataById(type, id)
    if (!row) sendBadReq(res, 'Item not found in the database')
    else res.status(200).send(row)
  }
})

// update a data type
router.post('/update', async (req, res) => {
  const { type, row } = req.body
  const error = msg => sendBadReq(res, msg)

  // validate data
  if (checkType(res, type)) {
    if (typeof row !== 'object') error('Invalid row data')
    else {
      const { data } = row
      if (typeof data !== 'object') error('Invalid data')
      else {
        const validationErrors = db.validate(type, data)
        if (validationErrors.length === 0) {
          await db.updateType(type, row)
          res.sendStatus(200)
        } else sendBadReqJSON(res, { errors: validationErrors })
      }
    }
  }
})

// middleware for receiving the music file
const upload = multer({ dest: path.join(__dirname, '../public/music/') })

// receive music files
router.post('/submit-file', upload.single('file'), async (req, res) => {
  const error = msg => sendBadReq(res, msg)
  const { file } = req
  if (!file) error('No file found')
  else {
    const { originalname, filename } = req.file
    if (!filename) error('Could not get file path')
    else if (!originalname) error('Could not get file name')
    else res.status(200).send({ originalname, filename })
  }
})

// get filtering by a name
router.post('/get-by-name', async (req, res) => {
  const { keyword, type } = req.body
  if (checkType(res, type)) {
    if (typeof keyword !== 'string') sendBadReq(res, 'Invalid keyword')
    else {
      const results = await db.getByName(type, keyword)
      res.status(200).send(results)
    }
  }
})

// get name with id
router.post('/get-name', async (req, res) => {
  const { type, id } = req.body
  if (checkType(res, type) && checkId(res, id)) {
    const name = await db.getQueryNameById(type, id)
    res.status(200).send({ name })
  }
})

/**
 * Send a bad request response with JSON
 * @param {import('express').Response} res
 * @param {object} obj - Object to send as JSON
 */
function sendBadReqJSON (res, obj) {
  res.status(400).send(obj)
}

/**
 * Send a bad request response with a single message
 * @param {import('express').Response} res
 * @param {string} msg - Error message
 */
function sendBadReq (res, msg) {
  sendBadReqJSON(res, { error: msg })
}

/**
 * Check if a condition is valid and send a bad request if it is not
 * @param {import('express').Response} res
 * @param {function() : boolean} callback - Callback function that returns the boolean value of the condition
 * @param {string} msg - Error message
 * @returns {boolean} Boolean for the condition checked
 */
function checkValid (res, callback, msg) {
  const valid = callback()
  if (!valid) sendBadReq(res, msg)
  return valid
}

/**
 * Check if a value is a valid type name and send a bad request if it is not
 * @param {import('express').Response} res
 * @param {import('../app/database').TypeName} value - Value to check
 * @returns {boolean} Whether the value is valid or not
 */
function checkType (res, value) {
  return checkValid(res, () => db.isType(value), 'Invalid type provided')
}

/**
 * Check if a value is a valid id and send a bad request if it is not
 * @param {import('express').Response} res
 * @param {number} value - Value to check
 * @returns {boolean} Whether the value is valid or not
 */
function checkId (res, value) {
  return checkValid(res, () => Number.isInteger(value), 'Id is not an integer')
}

module.exports = router
