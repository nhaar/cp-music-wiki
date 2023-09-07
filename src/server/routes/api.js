const express = require('express')
const router = express.Router()

const user = require('../database/user')
const ItemQuery = require('../item-class/item-query')
const PageGenerator = require('../gens/gen-list')
const ApiMiddleware = require('../misc/api-middleware')
const JSONErrorSender = require('../misc/json-error-sender')
const { getToken, isObject } = require('../misc/server-utils')
const { getMatch } = require('../misc/common-utils')
const itemClassChanges = require('../item-class/item-class-changes')
const ItemClassDatabase = require('../item-class/item-class-database')
const { itemClassHandler } = require('../item-class/item-class-handler')
const ChangesData = require('../frontend-bridge/changes-data')
const UserBlocker = require('../database/user-blocker')
const ItemPermissionFilter = require('../item-class/item-permission-filter')
const WatchlistHandler = require('../database/watchlist-handler')

/** Route for getting the default data object of a class */
router.post('/default', ApiMiddleware.checkClass, async (req, res) => {
  const { cls } = req.body
  res.status(200).send(itemClassHandler.defaults[cls])
})

/** Route for getting the row for an item (not deleted) in the database */
router.post('/get', ApiMiddleware.checkId, async (req, res) => {
  const { id } = req.body

  const row = await ItemClassDatabase.getUndeletedItem(id)
  if (row) {
    res.status(200).send(row)
  } else {
    JSONErrorSender.sendNotFound(res, 'Item not found in the database')
  }
})

/**
 * Route for sending an update to an item
 *
 * Only admins have access to this route
 * */
router.post('/update', ApiMiddleware.checkIP, ApiMiddleware.getValidatorMiddleware(body => {
  return itemClassHandler.isClassName(body.row.cls) && isObject(body.row) && isObject(body.row.data)
}, 'Invalid item provided'), async (req, res) => {
  // `row` is the item row and `isMinor` refers to whether the change is a minor edit
  const { row: uncheckedRow, isMinor } = req.body

  const permFilter = new ItemPermissionFilter(uncheckedRow, getToken(req))
  const row = await permFilter.filterChanges()

  // exit code errors
  if (row === 1) { // non-admin attemped creating object
    res.sendStatus(403)
    return
  } else if (row === 2) { // invalid object
    JSONErrorSender.sendBadReq(res, 'Invalid data object')
    return
  }

  if (await itemClassChanges.didDataChange(row.id, row.data)) {
    const validationErrors = itemClassChanges.validate(row.cls, row.data)
    if (validationErrors.length === 0) {
      await itemClassChanges.pushChange(getToken(req), row, isMinor)
      res.sendStatus(200)
    } else JSONErrorSender.sendBadReqJSON(res, { errors: validationErrors })
  } else {
    res.sendStatus(400)
  }
})

/** Route for checking whether an username is taken or not */
router.post('/check-username', async (req, res) => {
  // `name` is the name being checked
  const { name } = req.body
  res.status(200).send({ taken: await user.isNameTaken(name) })
})

/** Route for creating a new wiki account */
router.post('/create-account', ApiMiddleware.checkIP, async (req, res) => {
  // `name`, `password` and `email` are the new account's username, password and email
  const { name, password, email } = req.body
  if (await user.canCreate(name, password, email)) {
    user.createAccount(name, password, email, req.ip)
    res.sendStatus(200)
  } else res.sendStatus(400)
})

/** Route for requesting a password reset */
router.post('/send-reset-req', ApiMiddleware.checkIP, async (req, res) => {
  // `name` is the username of the account to reset the password
  const { name } = req.body
  user.sendResetPassEmail(name)
  res.sendStatus(200)
})

/** Route for resetting an account's password */
router.post('/reset-password', ApiMiddleware.checkIP, (req, res) => {
  // `token` is the verification token included in the password reset link and `password` is the new password
  const { token, password } = req.body
  user.resetPassword(token, password)
  res.sendStatus(200)
})

/**
 * Route for performing a rollback on an user's edits over an item
 *
 * Only admins can perform a rollback
 * */
router.post('/rollback', ApiMiddleware.checkAdmin, ApiMiddleware.checkIP, (req, res) => {
  // `user` is the name of the user and `item` is the id of the item of the rollback
  const { item } = req.body
  itemClassChanges.rollback(item, getToken(req))
  res.sendStatus(200)
})

/**
 * Route for deleting an item
 *
 * Only admins can delete items
 */
router.post('/delete', ApiMiddleware.checkAdmin, ApiMiddleware.checkIP, async (req, res) => {
  // `id` is the item to delete, `token`, `reason` is the id of the reason and `otherReason` is a string for the other reason
  const { id, reason, otherReason } = req.body

  // check if other items reference this item, if they do, send error
  const refs = await itemClassChanges.checkReferences(id)
  if (refs.length === 0) {
    // static and predefined items are undeletable
    if (await ItemClassDatabase.isStaticItem(id) || await itemClassChanges.isPredefined(id)) {
      res.sendStatus(400)
    } else {
      itemClassChanges.deleteItem(id, getToken(req), reason, otherReason)
      res.sendStatus(200)
    }
  } else {
    res.sendStatus(401)
  }
})

/**
 * Route for undeleting an item
 *
 * Only admins can undelete an item
 */
router.post('/undelete', ApiMiddleware.checkAdmin, ApiMiddleware.checkIP, ApiMiddleware.checkId, async (req, res) => {
  // `id` is the id of the item and `reason` is the reason for undeleting
  const { id, reason } = req.body
  await itemClassChanges.undeleteItem(id, reason, getToken(req))
  res.sendStatus(200)
})

/**
 * Route for receiving music files
 *
 * The file request must be a form with the file
 *
 * Only admins can submit files
 * */
router.post(
  '/submit-file', ApiMiddleware.checkAdmin, ApiMiddleware.checkIP, ApiMiddleware.musicUpload.single('file'),
  async (req, res) => {
    function error (msg) {
      return JSONErrorSender.sendBadReq(res, msg)
    }
    // The form must contain the file named as `file`
    const { file } = req
    if (!file) {
      error('No file found')
      return
    }
    // file variables are given via multer
    const { originalname, filename } = req.file

    if (!filename) error('Could not get file path')
    else if (!originalname) error('Could not get file name')
    else {
      // update item under the static class `file`
      itemClassChanges.updateItem({ cls: 'file', data: { originalname, filename } })
      res.sendStatus(200)
    }
  }
)

/** Route for getting all the items in a class filtered by a name */
router.post('/get-by-name', ApiMiddleware.checkClass, ApiMiddleware.checkKeyword, async (req, res) => {
  // `keyword` is the expression to filter with, `cls` is the class of items to search
  // and `withDeleted` is true if deleted items should be included
  const { keyword, cls, withDeleted } = req.body

  // if using deleted results, the search will be delivered in the form `Deleted:KEYWORD`
  // and only admins can see the deleted results
  const deletedArg = getMatch(keyword, /(?<=^Deleted:).*/)
  const includeDeleted = withDeleted && deletedArg !== null && await user.isAdmin(getToken(req))

  res.status(200).send(
    await ItemQuery.getByName(cls, includeDeleted ? deletedArg : keyword, !includeDeleted, includeDeleted)
  )
})

/**
 * Route for getting the name of an item
 *
 * It sends the first name if multiple exist
 * */
router.post('/get-name', ApiMiddleware.checkId, async (req, res) => {
  // `id` is the id of the item
  const { id } = req.body
  res.status(200).send({ name: await ItemClassDatabase.getQueryNameById(id) })
})

/** Route for an user to start a session */
router.post('/login', ApiMiddleware.checkIP, async (req, res) => {
  // `password` is the user's password and `user` is the user's username
  const { password, user: username } = req.body

  // blocked users can't log in
  const blocker = new UserBlocker({ username })
  if (await blocker.isBlocked()) {
    res.sendStatus(401)
    return
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    JSONErrorSender.sendBadReq(res, 'Invalid data')
    return
  }

  const token = await user.startSession(username, password, req.ip)
  if (token) {
    res.status(200).send({ token })
  } else {
    res.status(401).send({ error: 'Password or user was incorrect' })
  }
})

/** Route for the frontend to fetch recent changes */
router.post('/recent-changes', ApiMiddleware.checkChanges, async (req, res) => {
  // `days` is the time period in days to consider and `number` is the maximum number of changes
  const { days, number } = req.body
  res.status(200).send(await ChangesData.getLastRevisions(days, number))
})

/** Route for getting the names of the wiki pages filtered by a keyword */
router.post('/get-page-names', ApiMiddleware.checkKeyword, async (req, res) => {
  const { keyword } = req.body

  res.status(200).send(await PageGenerator.searchPages(keyword))
})

/** Route for (un)blocking users */
router.post('/block', ApiMiddleware.checkAdmin, ApiMiddleware.checkIP, async (req, res) => {
  const { user: userName, reason } = req.body
  if (!user.isNameTaken(userName)) {
    res.sendStatus(400)
    return
  }
  const blocker = new UserBlocker({ username: userName })
  blocker.swapBlock(reason)
  res.sendStatus(200)
})

/** Route for seeing an item's history */
router.post('/item-history', ApiMiddleware.checkChanges, async (req, res) => {
  const { id } = req.query
  const { days, number } = req.body

  res.status(200).send(await ChangesData.getLastRevisions(days, number, row => row.item_id === Number(id)))
})

/** Route for an user to (un)watch an item */
router.post('/watch', ApiMiddleware.checkId, async (req, res) => {
  const { watch, id, days } = req.body
  const watchlistHandler = new WatchlistHandler(await user.getUserId(getToken(req)))
  if (watch) watchlistHandler.addToWatchlist(id, days)
  else watchlistHandler.removeFromWatchlist(id)
  res.sendStatus(200)
})

module.exports = router
