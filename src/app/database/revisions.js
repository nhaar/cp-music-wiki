const sql = require('./sql-handler')
const clsys = require('./class-system')
const user = require('./user')

const Diff = require('diff')
const jsondiffpatch = require('jsondiffpatch')

class RevisionHandler {
  /** Create the database if it doesn't exist */
  constructor () {
    sql.create(`
      revisions (
        id SERIAL PRIMARY KEY,
        class TEXT,
        item_id INT,
        patch JSONB,
        wiki_user INT,
        approver INT,
        timestamp NUMERIC,
        minor_edit INT
      )
    `)
  }

  /**
   * Add a revision for a change or creation to the revisions table
   * @param {ClassName} cls - Class of the data being changed
   * @param {Row} row - Row for the data being changed
   * @param {string} token - Session token for the user submitting the revision
   */
  async addChange (cls, row, token) {
    let oldRow = clsys.getItem(cls, row.item)
    let id = row.id
    if (!oldRow) {
      if (!clsys.isStaticClass(cls)) {
        // figure out id of new item by seeing biggest serial
        id = (await sql.getBiggestSerial(cls))
      }
      oldRow = { data: clsys.defaults[cls] }
    }
    const userId = await user.getUserId(token)

    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    await this.insertRev(cls, id, userId, delta)
  }

  /**
   * Add a revision that represents an item deletion
   * @param {ClassName} cls - Class of the deleted item
   * @param {number} id - ID of the deleted item
   * @param {string} token - Session token for the user submitting the revision
   */
  async addDeletion (cls, id, token) {
    const userId = await user.getUserId(token)
    await this.insertRev(cls, id, userId)
  }

  /**
   * Insert a revision in the table
   * @param {import('./class-system').ClassName} cls - Class of the item being revised
   * @param {number} itemId - Id of the item being revised
   * @param {string} user - Id of the user submitting the revision
   * @param {jsondiffpatch.DiffPatcher} patch - The patch of the revision, if it is not a deletion
   */
  async insertRev (cls, itemId, user, patch) {
    if (patch) patch = JSON.stringify(patch)
    await sql.insert(
      'revisions',
      'class, item_id, wiki_user, timestamp, patch',
      [cls, itemId, user, Date.now(), patch = null]
    )
  }

  /**
   * Get what the data object for an item looked like at a certain revision
   * @param {number} revId - Id of the revision
   * @returns {ItemData} What the data was
   */
  async getRevisionData (revId) {
    const row = await sql.selectId('revisions', revId)
    const cls = row.class
    const itemId = row.item_id

    const revisions = await sql.selectGreaterAndEqual('revisions', 'id', revId, 'class, item_id', [cls, itemId])

    const data = (await clsys.getMainItem(cls, itemId)).data
    for (let i = revisions.length - 1; i >= 0; i--) {
      jsondiffpatch.unpatch(data, revisions[i].patch)
    }

    return data
  }

  /**
   * Get the next revision for the same item relative to another revision
   * @param {number} revId - The base revision
   * @returns {number} Id of the next revision
   */
  async getNextRev (revId) {
    const cur = await sql.selectId('revisions', revId)
    const cls = cur.class
    const itemId = cur.item_id

    const previous = await sql.pool.query(`
    SELECT MIN(id)
    FROM revisions
    WHERE id > ${revId} AND class = $1 AND item_id = $2
    `, [cls, itemId])

    return previous.rows[0].min
  }

  /**
   * Get the difference between two revisions
   * @param {import('./class-system').ItemData} old - Data for the older revision
   * @param {import('./class-system').ItemData} cur - Data for the newer revision
   * @returns {any[][]} An array where each element is an array containing the diff information
   */
  getRevDiff (old, cur) {
    const strs = [old, cur].map(data => JSON.stringify(data, null, 2))
    const diff = Diff.diffLines(...strs)

    const groups = []

    for (let i = 0; i < diff.length; i++) {
      const statement = diff[i]
      const next = diff[i + 1]
      let charDiff
      if (next) charDiff = Diff.diffChars(statement.value, next.value)
      if (statement.removed) {
        if (next.added) {
          i++
          groups.push(['removeadd', statement, next, charDiff])
        } else {
          groups.push(['remove', statement])
        }
      } else if (statement.added) {
        if (next.removed) {
          i++
          groups.push(['addremove', statement, next, charDiff])
        } else {
          groups.push(['add', statement])
        }
      }
    }

    return groups
  }

  /**
   * Select all the revisions in chronological order tied to a class item and get one of its columns
   * @param {ClassName} cls - Name of the class of the item
   * @param {number} id - Id of item or 0 for static classes
   * @param {string} column - Name of the column to get
   * @returns {string[] | number[]} Array with all the column values
   */
  async selectRevisions (cls, id, column) {
    return (
      await cls.selectAndEquals(
        'revisions',
        'class, item_id',
        [cls, id],
        column,
        'ORDER BY id ASC'
      )
    ).map(change => change[column])
  }

  /**
   * Get all patches for a class item
   * @param {ClassName} cls - Name of the class
   * @param {number} id - Id of item or 0 for static classes
   * @returns {jsondiffpatch.DiffPatcher[]} Array with all the patches
   */
  async selectPatches (cls, id) {
    return await this.selectRevisions(cls, id, 'patch')
  }

  /**
   * Get all the patch ids for a class item
   * @param {ClassName} cls - Name of the class
   * @param {number} id - Id of item or 0 for static classes
   * @returns {number[]} Array with all the ids
   */
  async selectPatchIds (cls, id) {
    return await this.selectRevisions(cls, id, 'id')
  }
}

module.exports = new RevisionHandler()
