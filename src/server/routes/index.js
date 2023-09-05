/** Express router for the all the routes
 * @module routers/index
 * @requires express
 */

/**
 * express module
 * @const
 */
const express = require('express')

/**
 * Express router grouping all routers
 * @type {object}
 * @const
 * @namespace indexRouter
 */
const router = express.Router()

const apiRouter = require('./api')
const user = require('../database/user')
const PageGenerator = require('../gens/gen-list')
const { getToken, isStringNumber } = require('../misc/server-utils')
const { itemClassHandler } = require('../item-class/item-class-handler')
const itemClassChanges = require('../item-class/item-class-changes')
const ItemClassDatabase = require('../item-class/item-class-database')
const editorData = require('../frontend-bridge/editor-data')
const ChangesData = require('../frontend-bridge/changes-data')

/**
 * Route for the homepage
 * @name GET/
 * @function
 * @memberof module:routers/index~indexRouter
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 */
router.get('/', async (req, res) => {
  // read the text from the static class `main_page`
  const text = (await ItemClassDatabase.getStaticClass('main_page')).data.text
  sendView(req, res, 'MainPage', 'Main Page', { text: text || '' })
})

/**
 * Route for all the wiki pages
 * @name GET/:value
 * @function
 * @memberof module:routers/index~indexRouter
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 */
router.get('/:value', async (req, res) => {
  // find what type of page is being accessed
  const matches = ['Special', 'Category'].map(word => {
    const match = req.params.value.match(`(?<=(^${word}:)).*`)
    return match && match[0]
  })
  const [specialMatch, categoryMatch] = matches

  /** Page name, without page discriminant (eg `Special:`) */
  const value = specialMatch || categoryMatch || req.params.value
  if (specialMatch) {
    switch (value) {
      // log in page
      case 'UserLogin': {
        sendView(req, res, value, 'Log In')
        break
      }
      // page for request password reset and for resetting password
      case 'ResetPassword': {
        // check existence of token for verifying the password reset
        const { t } = req.query
        if (t) {
          // token existence -> password reset page
          if (await user.resetLinkIsValid(t)) {
            sendView(req, res, value, 'Reset password', { token: t })
          } else {
            res.status(400).send('The link is expired or invalid')
          }
        } else {
          // token absence -> request password page
          sendView(req, res, 'RequestReset', 'Request password reset')
        }
        break
      }
      // route for logging out
      case 'UserLogout': {
        await user.disconnectUser(getToken(req))
        res.status(302).redirect('/')
        break
      }
      // page for creating an account
      case 'CreateAccount': {
        sendView(req, res, value, 'Create an account')
        break
      }
      // page with the recent wiki changes
      case 'RecentChanges': {
        sendView(req, res, value, 'Recent Changes')
        break
      }
      // page for uploading files to the wiki
      case 'FileUpload': {
        sendView(req, res, value, 'Upload a file')
        break
      }
      // random wiki page
      case 'Random': {
        res.status(302).redirect(`/${await PageGenerator.getRandomName()}`)
        break
      }
      // page for comparing revisions
      case 'Diff': {
        const { cur, old } = req.query
        sendDiffView(req, res, cur, old)
        break
      }
      // page for picking items
      case 'Items': {
        sendView(req, res, 'PreEditor', 'Item browser', { preeditor: editorData.preeditor })
        break
      }
      // pages for updating items (read, edit, delete and undelete)
      case 'Read': case 'Editor': case 'Delete': case 'Undelete': {
        // `id` is item id, used to read/edit/delete
        // `n` is an identifier for a class, used when creating a new item
        // page will either use `n` or `id`, not both together
        const { id, n } = req.query

        const validQuery = [id, n].filter(isStringNumber).length > 0

        // send error if query params are invalid
        if (!validQuery) {
          res.sendStatus(400)
          return
        }

        // if creating an item, figure out the class
        // otherwise it is unnecessary as the class will be embeded in the item row
        const clsData = n && editorData.preeditor[n]

        /** Class of the item (variable only used for creating item) */
        const cls = clsData && clsData.cls

        // send error if invalid `n` value
        if (n && !cls) {
          res.sendStatus(400)
          return
        }

        // build item row if creating an item, otherwise just fetch it
        /** Item row */
        let row
        if (id === undefined) {
          const data = await itemClassHandler.defaults[cls]
          row = { data, cls }
        } else {
          row = await ItemClassDatabase.getUndeletedItem(id)
        }

        /** True if the relevant item is deleted */
        let isDeleted = false

        if (!row) {
          // could not find in normal items, search for deleted item and if can't find send an error
          row = await ItemClassDatabase.getDeletedRow(id)
          if (row) {
            // overwrite deleted item id with normal item id
            row.id = id
            isDeleted = true
          } else {
            res.sendStaus(404)
            return
          }
        }

        // only admins can handle deleted items
        if (isDeleted && !(await user.isAdmin(getToken(req)))) {
          res.sendStatus(403)
          return
        }

        switch (value) {
          // page for undeleting items
          case 'Undelete': {
            sendView(req, res, value, 'Undelete item', { row })
            break
          }
          // page for deleting items
          case 'Delete': {
            sendView(req, res, value, 'Delete item', { deleteData: (await editorData.getDeleteData(Number(id))), row })
            break
          }
          // read and edit item pages
          default: {
            const args = value === 'Editor'
              ? ['Editor', 'Editor']
              : ['ReadItem', 'Read']
            sendView(req, res, ...args, {
              structure: itemClassHandler.classes[row.cls].structure,
              isStatic: itemClassHandler.isStaticClass(row.cls),
              row,
              isDeleted,
              n
            })
            break
          }
        }
        break
      }
      default: {
        res.sendStatus(404)
        break
      }
    }
  } else if (categoryMatch) {
    // page for a category
    // the category display is capped at 200 listed pages per page
    /** Number to start displaying the pages in the list, starts at 1 */
    const cur = req.query.cur || 1
    const pages = await PageGenerator.getPagesInCategory(value)
    sendView(req, res, 'Category', `Pages in category "${value}"`, { pages, cur, name: value })
  } else {
    // normal wiki page, which is generated from the page generators
    const gen = new PageGenerator(value)
    const data = await gen.parse()
    if (data === undefined) {
      res.sendStatus(404)
      return
    }
    sendView(req, res, `gens/${gen.gen.file}`, value, { name: value, data })
  }
})

/**
 * Route for the API routes
 * @name USE/api
 * @function
 * @memberof module:routers/index~indexRouter
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 */
router.use('/api', apiRouter)

/**
 * Route for non-existent routes
 * @name USE/*
 * @function
 * @memberof module:routers/index~indexRouter
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 */
router.use('*', (req, res) => {
  res.status(404).send('Page not found')
})

/**
 * Send a HTTP response with the HTML that will load a react page
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} - Express response
 * @param {string} scriptName - Name of the JavaScript JSX component, unhashed, to call in the HTML
 * @param {string} title - Title that will be displayed at the top of the page
 * @param {object} arg - An object with variables that will be passed to the specific component associated with the `scriptName` as a `props` object
 */
async function sendView (req, res, scriptName, title, arg = {}) {
  /** Data so the frontend knows who is navigating */
  const userRow = await user.checkUser(getToken(req))
  const userData = userRow ? { user: userRow.name } : undefined

  /** Variables to turn into browser globals */
  const vars = { title, arg, user: userData }

  // generating the javascript inside the script tag to define the browser globals
  const scriptTag = `
    <script>
      ${Object.entries(vars).map(entry => {
          const varName = entry[0]
          let varValue = entry[1]
          const type = typeof varValue
          // JSON stringify allows us to use a form that perfectly defines any object
          if (type === 'object') varValue = JSON.stringify(varValue)
          else if (type === 'string') {
            // value will be wrapped in double quotes to declare string, so escape those first
            varValue = varValue.replace(/"/g, '\\"')
            // escape line breaks so they don't disappear
            varValue = varValue.replace(/\n/g, '\\n')
            varValue = `"${varValue}"`
          }
          return `var ${varName} = ${varValue};`
        }).join('')}
    </script>
  `

  // hash script name to find the bundle and create root element for react's entrypoint
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script defer src="/${require('../auto/hasher')(scriptName)}.bundle.js"></script>
      </head>
        <body>
          <div id="root"></div>
          ${scriptTag}
        </body>
    </html>
  `)
}

/**
 * Send a HTTP response with the HTML for the `Diff` component page
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {number} cur - Id of the posterior revision in the comparison
 * @param {number} old - Id of the previous revision in the comparison
 */
async function sendDiffView (req, res, cur, old) {
  const diffData = [old, cur]
  for (let i = 0; i < diffData.length; i++) {
    diffData[i] = await itemClassChanges.getRevisionData(Number(diffData[i]))
  }
  // send error if either revisions don't exist
  if (diffData.includes(null)) {
    res.sendStatus(404)
    return
  }

  // send error if trying to diff two different items
  if (diffData[0].item_id !== diffData[1].item_id) {
    res.sendStatus(400)
    return
  }

  const diff = ChangesData.getRevDiff(...diffData)
  sendView(req, res, 'Diff', 'Difference between revisions', { diff })
}

module.exports = router
