const express = require('express')
const router = express.Router()

const path = require('path')

const apiRouter = require('./api')
const rev = require('../database/revisions')
const bridge = require('../database/class-frontend')
const clsys = require('../database/class-system')
const user = require('../database/user')
const del = require('../database/deletions')

function getView (scriptName, vars) {
  let scriptTag = ''
  if (vars) {
    scriptTag = `
    <script>
    ${
      Object.entries(vars).map(entry => {
        let value = entry[1]
        const type = typeof value
        if (type === 'object') value = JSON.stringify(value)
        else if (type === 'string') value = `"${value}"`
        return `var ${entry[0]} = ${value};`
      })
        .join('\n')
    }
    </script>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script defer src="/${scriptName}.bundle.js"></script>
      </head>
        <body>
          <div id="root"></div>
          ${scriptTag}
        </body>
    </html>
  `
}

// homepage
router.get('/', (req, res) => {
  res.send(getView('main-page'))
})

async function getDiffView (cur, old) {
  const curData = await rev.getRevisionData(Number(cur))
  const oldData = await rev.getRevisionData(Number(old))
  const diff = rev.getRevDiff(oldData, curData)

  return getView('diff', { diff })
}

router.get('/Special\\::value', async (req, res) => {
  const value = req.params.value
  if (value === 'UserLogin') {
    res.status(200).send(getView('user-login'))
  } else if (value === 'RecentChanges') {
    res.status(200).send(getView('recent-changes'))
  } else if (value === 'Diff') {
    const { cur, old } = req.query
    const view = await getDiffView(cur, old)
    res.status(200).send(view)
  } else if (value === 'Items') {
    res.status(200).send(getView('item-browser', { data: bridge.preeditorData }))
  } else if (value === 'Editor' || value === 'Read' || value === 'Delete') {
    const { t, id } = req.query
    let row
    const cls = bridge.preeditorData[t].cls
    if (id === undefined) {
      const data = await clsys.getDefault(cls)
      row = { data }
    } else {
      row = await clsys.getItem(cls, id)
    }
    const isDeleted = !row
    if (!row) {
      row = await del.getDeletedRow(cls, id)
    }
    if (value === 'Delete') {
      res.status(200).send(getView('delete', { deleteData: (await bridge.getDeleteData(t, Number(id))), row }))
    } else {
      res.status(200).send(getView(value === 'Editor' ? 'editor' : 'read-item', { editorData: bridge.editorData[t], row, isDeleted }))
    }
  } else if (value === 'FileUpload') {
    res.status(200).send(getView('file-upload'))
  } else if (value === 'Undelete') {
    const { t, id } = req.query
    if (await user.isAdmin(user.getToken(req))) {
      res.send(getView('undelete', { cls: bridge.editorData[t].cls, id }))
    } else {
      res.sendStatus(403)
    }
  } else {
    res.sendStatus(404)
  }
})

// editor selector
router.get('/pre-editor', (req, res) => {
  res.status(200).render('pre-editor.html')
})

// editor
router.get('/editor', (req, res) => {
  res.status(200).render('editor.html')
})

router.get('/lists', renderPage('OST Lists', `
<a href="series-list"> Series OST </a><br>
<a href="flash-list"> Club Penguin (Flash) OST </a><br>
<a href="cpi-list"> Club Penguin Island OST </a><br>
<a href="misc-list"> Misc OST </a><br>
<a href="mobile-list"> Mobile Apps OST </a><br>
<a href="game-day-list"> Club Penguin: Game Day! OST </a><br>
<a href="ds-list"> Club Penguin DS Games OST </a><br>
<a href="penguin-chat-list"> Penguin Chat OST </a><br>
<a href="unused-flash-list"> Unused Club Penguin (Flash) OST </a><br>
`))

function renderList (name) {
  return (req, res) => {
    res.status(200).sendFile(path.join(__dirname, `../views/generated/${name}.html`))
  }
}

router.get('/series-list', renderList('series-ost'))
router.get('/flash-list', renderList('flash-ost'))
router.get('/cpi-list', renderList('cpi-ost'))
router.get('/misc-list', renderList('misc-ost'))
router.get('/mobile-list', renderList('mobile-ost'))
router.get('/game-day-list', renderList('game-day-ost'))
router.get('/ds-list', renderList('ds-ost'))
router.get('/penguin-chat-list', renderList('penguin-chat-ost'))
router.get('/unused-flash-list', renderList('unused-flash-ost'))

router.get('/RecentChanges', renderPage('Recent Changes', `


    <div class="options-parent">

    <a class="change-options" role="button">
      <img class="img-gear" src="images/gear.png">
      <div class="button-options-text"></div>
      <img class="img-arrow" src="images/arrow-down.png">
    </a>

      <div class="settings-menu hidden">
        <div class="top-settings">
          <span class="setting-label">Results to show</span>
          <div>
            <button>50</button>
            <button>100</button>
            <button>250</button>
            <button>500</button>
          </div>
          <div>        
            <input type="checkbox">
            <span>Group results by page</span>
          </div>
        </div>
        <div class="bottom-settings">
          <span class="setting-label">Time period to search</span>
          <span class="minor-label">Recent hours</span>
          <div>
            <button>1</button>
            <button>2</button>
            <button>6</button>
            <button>12</button>
          </div>
          <span class="minor-label">Recent days</span>
          <div>
            <button>1</button>
            <button>3</button>
            <button>7</button>
            <button>14</button>
            <button>30</button>
          </div>
        </div>
      </div>

    </div>
  <div class="changes"></div>

<script src="scripts/recent-changes.js" type="module"></script>

`, `
<link rel="stylesheet" href="stylesheets/recent-changes.css">
`))

router.get('/Diff', renderPage('Difference between revisions', `
<div class="diff-viewer"></div>
<script src="scripts/diff.js" type="module"></script>
`, `
<link rel="stylesheet" href="stylesheets/diff.css">
`))

router.get('/user-page', renderPage('Login', `
  Write your credentials to sign in
  <br>
  <input class="name" placeholder="Name">
  <br>
  <input type="password" class="password" placeholder="Password">
  <br>
  <button class="send">SEND</button>

  <script src="scripts/user-page.js" type="module"></script>
`))

// api
router.use('/api', apiRouter)

// default
router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

function renderPage (header, content, extrahead) {
  return (req, res) => {
    res.status(200).render('page.html', { header, content, extrahead })
  }
}

module.exports = router
