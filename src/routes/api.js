const express = require('express')
const router = express.Router()

const multer = require('multer')

const path = require('path')

const db = require('../app/database')

router.post('/update', async (req, res) => {
  const { type, update } = req.body
  if (!type) res.status(400).send('No type was found')
  if (!update || !update[type].data) res.status(400).send('No data was found')
  const validationErrors = []
  for (const key in update) {
    let errors = []
    if (key === type) errors = db.validate(type, update[type].data)
    else {
      update[key].forEach(info => db.validete(key, info.data))
    }
    validationErrors.push(...errors)
  }
  if (validationErrors.length === 0) {
    await db.updateEdit(type, update)
    res.sendStatus(200)
  } else {
    res.status(400).send({ errors: validationErrors })
  }
})

const upload = multer({ dest: path.join(__dirname, '../public/music/') })

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
  await db.updateType('file', info)
  res.sendStatus(200)
})

router.post('/get', async (req, res) => {
  const response = await db.getEditData(req.body)

  res.status(200).send(response)
})

router.post('/default', async (req, res) => {
  const { type, id } = req.body
  const response = await db.getDefault(type, id)

  res.status(200).send(response)
})

router.post('/get-by-name', async (req, res) => {
  const { keyword, type } = req.body
  const results = await db.getByName(type, keyword)
  res.status(200).send(results)
})

router.post('/get-name', async (req, res) => {
  const { type, id } = req.body
  const name = await db.getQueryNameById(type, id)
  res.status(200).send({ name })
})

module.exports = router
