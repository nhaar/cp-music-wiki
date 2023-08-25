const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

const bridge = require('../database/class-frontend')
const user = require('../database/user')
const rev = require('../database/revisions')
const clsys = require('../database/class-system')
const del = require('../database/deletions')
const gen = require('../gens/gen-list')

// const Gen = require('../misc/lists')
// const gen = new Gen()

const checkClass = checkValid(body => clsys.isMajorClass(body.cls), 'Invalid item class provided')

const checkItem = checkValid(body => {
  const { row } = body
  return clsys.isMajorClass(row.cls) && (row !== null && typeof row === 'object')
}, 'Invalid item provided')

const checkId = checkValid(body => Number.isInteger(body.id), 'Id is not an integer')

// get default data
router.post('/default', checkClass, async (req, res) => {
  const { cls } = req.body
  const row = await clsys.getDefault(cls)
  res.status(200).send(row)
})

// get a data row
router.post('/get', checkId, async (req, res) => {
  const { id } = req.body

  const row = await clsys.getItem(id)
  if (row) {
    res.status(200).send(row)
  } else {
    sendNotFound(res, 'Item not found in the database')
  }
})

function getToken (req) {
  const { cookie } = req.headers
  const match = cookie.match(/(?<=(session=))[\d\w]+(?=(;|$))/)
  return match && match[0]
}

// update a data type
router.post('/update', checkAdmin, checkItem, async (req, res) => {
  const { row, isMinor } = req.body

  const token = getToken(req)

  const { data, cls } = row
  const validationErrors = clsys.validate(cls, data)
  if (validationErrors.length === 0) {
    await rev.addChange(row, token, isMinor)
    clsys.updateItem(row)
    // gen.updateLists()
    res.sendStatus(200)
  } else sendBadReqJSON(res, { errors: validationErrors })
})

// middleware for receiving the music file
const upload = multer({ dest: path.join(__dirname, '../../client/music/') })

async function checkAdmin (req, res, next) {
  let isAdmin = false
  const session = getToken(req)
  if (session) {
    isAdmin = await user.isAdmin(session)
  }

  if (isAdmin) {
    next()
  } else {
    res.status(403).send({})
  }
}

router.post('/delete', checkAdmin, async (req, res) => {
  const { id, token, reason, otherReason } = req.body

  // check any references
  const cls = (await clsys.getItem(id)).cls
  const refs = await clsys.checkReferences(cls, id)
  if (refs.length === 0) {
    if (await clsys.isStaticClass(cls) || await clsys.isPredefined(id)) {
      res.sendStatus(400)
    } else {
      // delete
      del.deleteItem(id, token, reason, otherReason)
      res.sendStatus(200)
    }
  } else {
    res.sendStatus(401)
  }
})

router.post('/undelete', checkAdmin, async (req, res) => {
  const { id, reason } = req.body
  del.undeleteItem(id, reason, user.getToken(req))
})

// receive music files
router.post('/submit-file', checkAdmin, upload.single('file'), async (req, res) => {
  const error = msg => sendBadReq(res, msg)
  const { file } = req
  if (!file) error('No file found')
  else {
    const { originalname, filename } = req.file
    if (!filename) error('Could not get file path')
    else if (!originalname) error('Could not get file name')
    else {
      clsys.updateItem({ cls: 'file', data: { originalname, filename } })
      res.sendStatus(200)
    }
  }
})

// get filtering by a name
router.post('/get-by-name', checkClass, async (req, res) => {
  const { keyword, cls, withDeleted } = req.body
  const isAdmin = await user.isAdmin(user.getToken(req))
  if (typeof keyword !== 'string') sendBadReq(res, 'Invalid keyword')
  else {
    let results
    const deletedArg = keyword.match(/(?<=^Deleted:).*/)
    if (withDeleted && deletedArg && isAdmin) {
      results = await del.getByName(cls, deletedArg[0])
    } else {
      results = await clsys.getByName(cls, keyword)
    }
    res.status(200).send(results)
  }
})

// get name with id
router.post('/get-name', checkId, async (req, res) => {
  const { id } = req.body
  const name = await clsys.getQueryNameById(id)
  res.status(200).send({ name })
})

router.post('/login', async (req, res) => {
  const { password, user: username } = req.body
  if (typeof username !== 'string' || typeof password !== 'string') sendBadReq(res, 'Invalid data')
  const token = await user.checkCredentials(username, password)
  if (token) {
    res.status(200).send({ token })
  } else {
    res.status(401).send({ error: 'Password or user was incorrect' })
  }
})

router.get('/recent-changes', async (req, res) => {
  const latest = await bridge.getLastRevisions(7)
  res.status(200).send(latest)
  // get revisions from last day, later add frontend give options
})

router.post('/get-page-names', async (req, res) => {
  const { keyword } = req.body

  res.status(200).send(
    (await gen.getAllNames())
      .filter(name => name.match(new RegExp(`${keyword}`, 'i')))
  )
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
