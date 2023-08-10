const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

const db = require('../app/database')
const gen = require('../app/lists')
const { checkCredentials } = require('../app/login')

router.post('/editor-data', async (req, res) => {
  const { t } = req.body

  res.status(200).send(db.getEditorData(t))
})

// get default data
router.post('/default', async (req, res) => {
  const { cls } = req.body

  if (checkClass(res, cls)) {
    const row = await db.getDefault(cls)
    res.status(200).send(row)
  }
})

// get a data row
router.post('/get', async (req, res) => {
  const { cls, id } = req.body

  if (checkClass(res, cls) && checkId(res, id)) {
    if (db.isStaticClass(cls)) {
      const row = await db.getStatic(cls)
      res.status(200).send(row)
    } else {
      const row = await db.getItemById(cls, id)
      if (!row) sendBadReq(res, 'Item not found in the database')
      else res.status(200).send(row)
    }
  }
})

// update a data type
router.post('/update', async (req, res) => {
  const { cls, row, session } = req.body
  const isAdmin = await db.isAdmin(session)
  if (isAdmin) {
    const error = msg => sendBadReq(res, msg)

    // validate data
    if (checkClass(res, cls)) {
      const isStatic = db.isStaticClass(cls)
      if (isStatic && row.id !== 0) error('Invalid id')
      else if (typeof row !== 'object') error('Invalid row data')
      else {
        const { data } = row
        if (typeof data !== 'object') error('Invalid data')
        else {
          const validationErrors = db.validate(cls, data)
          if (validationErrors.length === 0) {
            await db.addChange(cls, row)
            if (isStatic) {
              await db.updateStatic(cls, row)
              res.sendStatus(200)
            } else {
              await db.updateItem(cls, row)
              res.sendStatus(200)
            }
          } else sendBadReqJSON(res, { errors: validationErrors })
        }
      }
    }
  } else {
    res.status(403).send('No permitions')
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
  const { keyword, cls } = req.body
  if (checkClass(res, cls)) {
    if (typeof keyword !== 'string') sendBadReq(res, 'Invalid keyword')
    else {
      const results = await db.getByName(cls, keyword)
      res.status(200).send(results)
    }
  }
})

// get name with id
router.post('/get-name', async (req, res) => {
  const { cls, id } = req.body
  if (checkClass(res, cls) && checkId(res, id)) {
    const name = await db.getQueryNameById(cls, id)
    res.status(200).send({ name })
  }
})

router.post('/get-preeditor-data', async (req, res) => {
  const data = db.getPreeditorData()
  res.status(200).send(data)
})

router.post('/get-editor-data', async (req, res) => {
  const { t } = req.body
  const data = db.getEditorData(t)
  res.status(200).send(data)
})

router.post('/login', async (req, res) => {
  const { user, password } = req.body
  const token = await checkCredentials(user, password)
  if (token) {
    res.status(200).send({ token })
  } else {
    res.status(400).send({ error: 'errou' })
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
 * Check if a value is a valid class name and send a bad request if it is not
 * @param {import('express').Response} res
 * @param {any} value - Value to check
 * @returns {boolean} Whether the value is valid or not
 */
function checkClass (res, value) {
  const msg = 'Invalid type provided'
  return checkValid(res, () => db.isStaticClass(value) || db.isMainClass(value), msg)
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
