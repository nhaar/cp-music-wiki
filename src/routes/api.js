const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

const db = require('../app/database')
const Gen = require('../app/lists')
const gen = new Gen(db)

const { checkCredentials } = require('../app/login')

const checkClass = checkValid(body => db.isStaticClass(body.cls) || db.isMainClass(body.cls), 'Invalid type provided')

const checkId = checkValid(body => Number.isInteger(body.id), 'Id is not an integer')

// send data for a given editor class
router.post('/editor-data', async (req, res) => {
  const { t } = req.body
  if (typeof t !== 'number' || t < 0 || t >= db.classNumber) {
    sendBadReq(res, 'Invalid class number provided')
  } else {
    res.status(200).send(db.getEditorData(t))
  }
})

// get default data
router.post('/default', checkClass, async (req, res) => {
  const { cls } = req.body

  const row = await db.getDefault(cls)
  res.status(200).send(row)
})

// get a data row
router.post('/get', checkClass, checkId, async (req, res) => {
  const { cls, id } = req.body

  if (db.isStaticClass(cls)) {
    const row = await db.getStatic(cls)
    res.status(200).send(row)
  } else {
    const row = await db.getItemById(cls, id)
    if (!row) sendNotFound(res, 'Item not found in the database')
    else res.status(200).send(row)
  }
})

// update a data type
router.post('/update', checkAdmin, checkClass, async (req, res) => {
  const { cls, row } = req.body
  const error = msg => sendBadReq(res, msg)

  const { cookie } = req.headers
  const token = cookie.match(/(?<=(session=))[\d\w]+(?=(;|$))/)[0]

  // validate data
  if (db.isStaticClass(cls) && row.id !== 0) error('Invalid id for static class')
  else if (typeof row !== 'object') error('Invalid row object')
  else {
    const { data } = row
    if (typeof data !== 'object') error('Invalid data object')
    else {
      const validationErrors = db.validate(cls, data)
      if (validationErrors.length === 0) {
        await db.update(cls, row, token)
        gen.updateLists()
        res.sendStatus(200)
      } else sendBadReqJSON(res, { errors: validationErrors })
    }
  }
})

// middleware for receiving the music file
const upload = multer({ dest: path.join(__dirname, '../public/music/') })

async function checkAdmin (req, res, next) {
  let isAdmin = false
  const cookie = req.headers.cookie
  if (cookie) {
    const session = cookie.match(/(?<=(session=))[\d\w]+(?=(;|$))/)
    if (session) {
      isAdmin = await db.isAdmin(session[0])
    }
  }

  if (isAdmin) {
    next()
  } else {
    res.status(403).send({})
  }
}

// receive music files
router.post('/submit-file', checkAdmin, upload.single('file'), async (req, res) => {
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

router.post('/delete-item', checkAdmin, checkClass, checkId, async (req, res) => {
  const { cls, id } = req.body

  if (db.isMainClass(cls)) {
    const row = await db.getItemById(cls, id)
    if (row) {
      await db.deleteItem(cls, id)
      gen.updateLists()
    } else sendNotFound(res, 'Item not found in the database')
  } else sendBadReq(res, 'Can only delete item from main class')

  res.sendStatus(200)
})

// get filtering by a name
router.post('/get-by-name', checkClass, async (req, res) => {
  const { keyword, cls } = req.body
  if (typeof keyword !== 'string') sendBadReq(res, 'Invalid keyword')
  else {
    const results = await db.getByName(cls, keyword)
    res.status(200).send(results)
  }
})

// get name with id
router.post('/get-name', checkClass, checkId, async (req, res) => {
  const { cls, id } = req.body
  const name = await db.getQueryNameById(cls, id)
  res.status(200).send({ name })
})

router.get('/get-preeditor-data', async (req, res) => {
  const data = db.getPreeditorData()
  res.status(200).send(data)
})

router.post('/login', async (req, res) => {
  const { user, password } = req.body
  if (typeof user !== 'string' || typeof password !== 'string') sendBadReq(res, 'Invalid data')
  const token = await checkCredentials(user, password)
  if (token) {
    res.status(200).send({ token })
  } else {
    res.status(401).send({ error: 'Password or user was incorrect' })
  }
})

function sendStatusJSON (res, status, obj) {
  res.status(status).send(obj)
}

/**
 * Send a bad request response with JSON
 * @param {import('express').Response} res
 * @param {object} obj - Object to send as JSON
 */
function sendBadReqJSON (res, obj) {
  sendStatusJSON(res, 400, obj)
}

/**
 * Send a bad request response with a single message
 * @param {import('express').Response} res
 * @param {string} msg - Error message
 */
function sendBadReq (res, msg) {
  sendBadReqJSON(res, { error: msg })
}

function sendNotFound (res, msg) {
  sendStatusJSON(res, 404, { error: msg })
}

/**
 *
 * @param {*} callback
 * @param {*} msg
 * @returns {function()}
 */
function checkValid (callback, msg) {
  return (req, res, next) => {
    if (callback(req.body)) {
      next()
    } else {
      sendBadReq(res, msg)
    }
  }
}

module.exports = router
