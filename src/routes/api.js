const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

const bridge = require('../app/database/class-frontend')
const user = require('../app/database/user')
const rev = require('../app/database/revisions')
const clsys = require('../app/database/class-system')
const Gen = require('../app/lists')
const gen = new Gen()

const checkClass = checkValid(body => clsys.isStaticClass(body.cls) || clsys.isMainClass(body.cls), 'Invalid type provided')

const checkId = checkValid(body => Number.isInteger(body.id), 'Id is not an integer')

// send data for a given editor class
router.post('/editor-data', async (req, res) => {
  const { t } = req.body
  if (typeof t !== 'number' || t < 0 || t >= bridge.classNumber) {
    sendBadReq(res, 'Invalid class number provided')
  } else {
    res.status(200).send(bridge.getEditorData(t))
  }
})

// get default data
router.post('/default', checkClass, async (req, res) => {
  const { cls } = req.body

  const row = await clsys.getDefault(cls)
  res.status(200).send(row)
})

// get a data row
router.post('/get', checkClass, checkId, async (req, res) => {
  const { cls, id } = req.body

  if (clsys.isStaticClass(cls)) {
    const row = await clsys.getStatic(cls)
    row.id = 0
    res.status(200).send(row)
  } else {
    const row = await clsys.getItemById(cls, id)
    if (!row) sendNotFound(res, 'Item not found in the database')
    else res.status(200).send(row)
  }
})

function getToken (req) {
  const { cookie } = req.headers
  return cookie.match(/(?<=(session=))[\d\w]+(?=(;|$))/)[0]
}

// update a data type
router.post('/update', checkAdmin, checkClass, async (req, res) => {
  const { cls, row } = req.body
  const error = msg => sendBadReq(res, msg)

  const token = getToken(req)

  // validate data
  if (clsys.isStaticClass(cls) && row.id !== 0) error('Invalid id for static class')
  else if (typeof row !== 'object') error('Invalid row object')
  else {
    const { data } = row
    if (typeof data !== 'object') error('Invalid data object')
    else {
      const validationErrors = clsys.validate(cls, data)
      if (validationErrors.length === 0) {
        await rev.addChange(cls, row, token)
        if (clsys.isStaticClass(cls)) {
          await clsys.updateStatic(cls, row)
        } else {
          await clsys.updateItem(cls, row)
        }
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
      isAdmin = await user.isAdmin(session[0])
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

// get filtering by a name
router.post('/get-by-name', checkClass, async (req, res) => {
  const { keyword, cls } = req.body
  if (typeof keyword !== 'string') sendBadReq(res, 'Invalid keyword')
  else {
    const results = await clsys.getByName(cls, keyword)
    res.status(200).send(results)
  }
})

// get name with id
router.post('/get-name', checkClass, checkId, async (req, res) => {
  const { cls, id } = req.body
  const name = await clsys.getQueryNameById(cls, id)
  res.status(200).send({ name })
})

router.get('/get-preeditor-data', async (req, res) => {
  const data = bridge.getPreeditorData()
  res.status(200).send(data)
})

router.post('/login', async (req, res) => {
  const { password } = req.body
  const username = req.body.user
  if (typeof username !== 'string' || typeof password !== 'string') sendBadReq(res, 'Invalid data')
  const token = await user.checkCredentials(username, password)
  if (token) {
    res.status(200).send({ token })
  } else {
    res.status(401).send({ error: 'Password or user was incorrect' })
  }
})

router.get('/recent-changes', async (req, res) => {
  const latest = await bridge.getLastRevisions(1)
  res.status(200).send(latest)
  // get revisions from last day, later add frontend give options
})

router.post('/get-revisions', async (req, res) => {
  const { cur, old } = req.body
  const curData = await rev.getRevisionData(Number(cur))
  const oldData = await rev.getRevisionData(Number(old))
  const diff = rev.getRevDiff(oldData, curData)

  res.status(200).send({ curData, diff })
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
