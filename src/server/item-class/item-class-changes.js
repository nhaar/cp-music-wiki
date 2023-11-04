const jsondiffpatch = require('jsondiffpatch')

const { getName, deepcopy } = require('../misc/common-utils')
const ItemClassDatabase = require('./item-class-database')
const { itemClassHandler } = require('./item-class-handler')
const sql = require('../database/sql-handler')
const user = require('../database/user')
const { compareObjects, isObject, getLastElement } = require('../misc/server-utils')
const querywordsHandler = require('./querywords-handler')
const ObjectPathHandler = require('../misc/object-path-handler')
const CellList = require('../database/cell-list')
const UserAlerts = require('../database/user-alerts')

/** Handles a revision's tags */
class Tagger extends CellList {
  /**
   * Build instance linked to revision of id `rev`
   * @param {number} rev
   */
  constructor (rev) {
    super('revisions', 'tags', 'id', rev)
  }
}

class ItemClassChanges {
  constructor () {
    this.assignIdRefMap()
  }

  /**
   * Delete an item from the database
   * @param {number} id - Item id
   * @param {string} token - Session token of the user performing deletion
   * @param {string} reason - Reason string
   */
  async deleteItem (id, token, reason) {
    const row = await ItemClassDatabase.getItem(id)
    sql.delete('items', 'id', id)
    sql.insert('deleted_items', 'cls, item_id, data, querywords', [row.cls, id, JSON.stringify(row.data), row.querywords])
    this.insertDeletion(id, token, reason, true)
  }

  /**
   * Add a deletion or undeletion into the deletion log
   * @param {number} id - Item id to delete/undelete
   * @param {string} token - Session token for the user that performed the deletion/undeletion
   * @param {string} reason - Reason string
   * @param {boolean} isDeletion - `true` if this log entry pertains to a deletion, `false` if it pertains to an undeletion
   */
  async insertDeletion (id, token, reason, isDeletion) {
    await sql.insert(
      'deletion_log',
      'item_id, wiki_user, timestamp, reason, is_deletion',
      [id, (await user.getUserId(token)), Date.now(), reason, Number(isDeletion)]
    )
  }

  /** Create the object that maps for each class all the paths where other classes reference the class */
  assignIdRefMap () {
    this.idPaths = {}
    for (const cls in itemClassHandler.classes) {
      this.idPaths[cls] = itemClassHandler.findPaths(prop => {
        return prop.content === 'ID' && prop.args[0] === cls
      })
    }
  }

  /**
   * Check all items that reference a target item within their data
   * @param {number} id - Target item id
   * @returns {string[][]} Array of arrays that contain as the first element the string for the class name and second element the string for the item name
   */
  async checkReferences (id) {
    const cls = await ItemClassDatabase.getClass(id)
    const clsPaths = this.idPaths[cls]
    const encountered = []
    for (const cls in clsPaths) {
      const paths = clsPaths[cls]
      const allElements = await ItemClassDatabase.selectAllInClass(cls)

      paths.forEach(path => {
        allElements.forEach(element => {
          if (ObjectPathHandler.travelPath(path, element.data).includes(id)) {
            encountered.push([itemClassHandler.classes[cls].name, getName(element.querywords)])
          }
        })
      })
    }

    return encountered
  }

  /**
   * Check if an item data object is different from the one in the database
   * @param {number} id - Item id
   * @param {ItemData} data - Item data to compare with the database one
   * @returns {boolean} `true` if the data is different and `false` if it is the same
   */
  async didDataChange (id, data) {
    const old = await ItemClassDatabase.getItem(id)
    if (!old) return true
    else {
      return !compareObjects(old.data, data)
    }
  }

  /**
   * Push a request for updating an item to the database
   * @param {number} user - Id of user submitting the update
   * @param {ItemRow} row - Updated row object for the item
   * @param {boolean} isMinor - `true` if it is a minor edit, `false` otherwise
   * @param {string[]} tags - Tags to add to the revision
   * @returns {number} Id of changed item
   */
  async pushChange (user, row, isMinor, tags = []) {
    const id = await this.addChange(row, user, isMinor, tags)
    await this.updateItem(row)
    UserAlerts.sendItemChangedNotification(id, user)
    return id
  }

  /**
   * Update an item in the database or add if it doesn't exist
   * @param {ItemRow} row - Row object for the item
   */
  async updateItem (row) {
    const { data, id, cls } = row

    if (id === undefined) ItemClassDatabase.insertItem(cls, data)
    else {
      await sql.updateOneCondition(
        'items', 'data, querywords', [JSON.stringify(data), querywordsHandler.getQueryWords(cls, data)], 'id', id
      )
    }
  }

  /**
   * Check if an item is predefined
   * @param {number} id - Item id
   * @returns {boolean} `true` if the item is predefined, `false` otherwise
   */
  async isPredefined (id) {
    return Boolean((await ItemClassDatabase.getItem(id)).predefined)
  }

  /**
   * Check if an item data follows the rules defined for it
   * @param {string} cls - Item class of the data
   * @param {ItemData} data - Item data to validate
   * @returns {string[]} Array where each element is a string describing a validation error
   */
  validate (cls, data) {
    const errors = []

    // iterate through each property and each validation statement in the definition to validate it
    const iterateObject = (structure, validators, itemData, path) => {
      validators.forEach(validator => {
        try {
          validator.checkRule(itemData, errors)
        } catch (error) {
          errors.push(`Validation exception at ${path.join()}\n${error}`)
        }
      })
      structure.forEach(prop => {
        // check if the type of a property is the same as it was defined
        const checkType = (value, prop, path, ignoreArray = false) => {
          if (prop.array && !ignoreArray) {
            // iterate through all the nested arrays to find all destination paths
            const dimensionIterator = (array, level) => {
              if (Array.isArray(array)) {
                for (let i = 0; i < array.length; i++) {
                  const newPath = deepcopy(path)
                  newPath.push(`[${i}]`)
                  if (level === 1) {
                    checkType(array[i], prop, newPath, true)
                  } else {
                    dimensionIterator(array[i], level - 1)
                  }
                }
              } else {
                errors.push(`${path.join('')} is not an array`)
              }
            }
            dimensionIterator(value, prop.dim)
          } else {
            const errorMsg = indefiniteDescription => {
              errors.push(`${path.join('')} must be ${indefiniteDescription}`)
            }
            if (prop.object) {
              if (isObject(value)) {
                iterateObject(prop.content, prop.validators, value, path)
              } else errorMsg('a valid object')
            } else {
              if (prop.query) {
                if (typeof value !== 'string' || !value) {
                  errors.push(`Must give a name (error at ${path.join('')})`)
                }
              } else if (value === null) return

              switch (prop.content) {
                case 'TEXTSHORT': case 'TEXTLONG': {
                  if (typeof value !== 'string') {
                    errorMsg('a text string')
                  }
                  break
                }
                case 'ID': case 'INT': case 'FILE': {
                  if (!Number.isInteger(value)) {
                    errorMsg('an integer number')
                  }
                  break
                }
                case 'BOOLEAN': {
                  if (typeof value !== 'boolean') {
                    errorMsg('a boolean value')
                  }
                  break
                }
                case 'DATE': {
                  let validDate = true
                  try {
                    if (!value.match(/\d+-\d{2}-\d{2}/)) {
                      validDate = false
                    }
                  } catch {
                    validDate = false
                  }
                  if (!validDate) errorMsg('a valid date string (YYYY-MM-DD)')
                  break
                }
                default: {
                  throw new Error('Unexpected default value')
                }
              }
            }
          }
        }

        checkType(itemData[prop.property], prop, path.concat([`.${prop.property}`]))
      })
    }

    const classDefinition = itemClassHandler.classes[cls]

    iterateObject(classDefinition.structure, classDefinition.validators, data, [`[${cls} Object]`])

    return errors
  }

  /**
   * Bring a deleted item back to normal status
   * @param {number} id - Item id
   * @param {string} reason - Reason for undeleting
   * @param {string} token - Session token for the user performing undeletion
   */
  async undeleteItem (id, reason, token) {
    const row = await ItemClassDatabase.getDeletedRow(id)
    sql.delete('deleted_items', 'id', row.id)
    sql.insert('items', 'id, cls, data, querywords', [id, row.cls, row.data, row.querywords])
    this.insertDeletion(id, token, reason, false)
  }

  /**
   * Add a revision for a change or creation to the revisions table
   * @param {Row} row - Row for the data being changed
   * @param {number} iser - Id of user submitting the revision
   * @param {boolean} isMinor - Whether this revision is a minor edit or not
   * @param {string[]} tags - Array of tags to add to the revision
   * @returns {number} Id of the changed item
   */
  async addChange (row, user, isMinor, tags = []) {
    let oldRow = await ItemClassDatabase.getUndeletedItem(row.id)
    let id = row.id
    let created = false
    if (!oldRow) {
      // figure out id of new item by seeing biggest serial
      id = (await sql.getBiggestSerial('items')) + 1
      created = true
      oldRow = { data: itemClassHandler.defaults[row.cls] }
    }

    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    await this.insertRev(id, user, delta, isMinor, created, tags)
    return id
  }

  /**
   * Insert a revision in the table
   * @param {number} itemId - Id of the item being revised
   * @param {string} user - Id of the user submitting the revision
   * @param {jsondiffpatch.DiffPatcher} patch - The patch of the revision
   * @param {boolean} isMinor - Whether the edit is a minor edit or not
   * @param {boolean} created - `true` if this change created an item, `false` otherwise
   * @param {text[]} tags - Array with all tags to include in revision
   */
  async insertRev (itemId, user, patch = null, isMinor = false, created = false, tags = []) {
    if (patch) patch = JSON.stringify(patch)
    await sql.insert(
      'revisions',
      'item_id, wiki_user, timestamp, patch, minor_edit, created, tags',
      [itemId, user, Date.now(), patch, Number(isMinor), Number(created), Tagger.getListString(...tags)]
    )
  }

  /**
   * Get what the data object for an item looked like **AFTER** a certain revision
   * @param {number} revId - Id of the revision
   * @returns {ItemData} What the data was
   */
  async getRevisionData (revId) {
    if (isNaN(revId)) return null
    const row = await sql.selectId('revisions', revId)
    if (!row) return null

    const itemId = row.item_id

    const revisions = await sql.selectGreaterAndEqual('revisions', 'id', revId, 'item_id', itemId)

    const data = (await ItemClassDatabase.getItem(itemId)).data
    for (let i = 0; i < revisions.length; i++) {
      jsondiffpatch.unpatch(data, revisions[i].patch)
    }

    return data
  }

  /**
   * Get the next revision for the same item relative to another revision
   * @param {number} revId - The base revision
   * @returns {number | undefined} Id of the next revision or `undefined` if there is none
   */
  async getNextRev (revId) {
    const cur = await sql.selectId('revisions', revId)
    const ids = (await sql.selectGreaterAndEqual('revisions', 'id', revId, 'item_id', cur.item_id)).map(row => row.id)
    return ids.length === 0 ? undefined : Math.min(...ids)
  }

  /**
   * Select all the revisions in chronological order tied to a class item
   * @param {number} id - Item id
   * @returns {object[]} Array with all revisions
   */
  async selectRevisions (id) {
    return (
      await sql.selectWithColumn(
        'revisions',
        'item_id',
        id,
        '*',
        true
      )
    )
  }

  /**
   * Perform a rollback on an item
   *
   * A rollback entails reversing all the last edits in an item that were done by the same user
   * @param {number} item - Item id
   * @param {string} token - Session token of the user peforming the rollback
   */
  async rollback (item, token) {
    const revisions = await this.selectRevisions(item)
    const lastRev = getLastElement(revisions)
    const lastUser = lastRev.wiki_user
    const lastUserRevisions = []
    const isRollback = await (new Tagger(lastRev.id)).hasItem('rollback')
    // if last revision is a rollback, undoing everything as normal would do nothing
    if (isRollback) {
      lastUserRevisions.push(lastRev)
    } else {
      for (let i = revisions.length - 1; i >= 0; i--) {
        const revision = revisions[i]
        if (revision.wiki_user === lastUser) {
          lastUserRevisions.push(revision)
        } else break
      }
    }

    const row = await ItemClassDatabase.getItem(item)
    // delete if first revision is a creation, else undo changes
    if (getLastElement(lastUserRevisions).created) {
      await this.deleteItem(item, token, 0, 'Rollback')
    } else {
      for (let i = 0; i < lastUserRevisions.length; i++) {
        const revision = lastUserRevisions[i]
        row.data = jsondiffpatch.unpatch(row.data, revision.patch)
      }

      await this.pushChange(token, row, true, ['rollback'])
    }
    for (let i = 0; i < lastUserRevisions.length; i++) {
      const revision = lastUserRevisions[i]
      const tagger = new Tagger(revision.id)
      await tagger.addItem('reverted')
    }
  }
}

module.exports = new ItemClassChanges()
