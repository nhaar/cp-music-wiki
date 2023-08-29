const sql = require('./sql-handler')
const clsys = require('./class-system')
const user = require('./user')
const del = require('./deletions')

const Diff = require('diff')
const jsondiffpatch = require('jsondiffpatch')
const { getLastElement } = require('../misc/server-utils')

class Tagger {
  constructor (rev) {
    this.id = rev
  }

  static getTagString (...tags) {
    return tags.join('%')
  }

  async hasTag (tag) {
    const tags = await this.getTags()
    return tags.split('%').includes(tag + '')
  }

  async updateTags (updatefn) {
    const tags = updatefn(await this.getTags())
    await sql.update('revisions', 'tags', 'id = $1', [tags], [this.id])
  }

  async getTags () {
    return (await sql.selectId('revisions', this.id)).tags
  }

  async addTag (tag) {
    await this.updateTags(old => {
      return `${old}%${tag}`
    })
  }

  async removeTag (tag) {
    if (typeof tag === 'string') tag = Number(tag)
    await this.updateTags(old => {
      return old.split('%').filter(t => Number(t) !== tag).join('%')
    })
  }
}

class RevisionHandler {
  /** Create the database if it doesn't exist */
  constructor () {
    sql.create(`
      revisions (
        id SERIAL PRIMARY KEY,
        cls TEXT,
        item_id INT,
        patch JSONB,
        wiki_user INT,
        approver INT,
        timestamp NUMERIC,
        minor_edit INT,
        created INT,
        tags TEXT
      )
    `)
  }

  /**
   * Add a revision for a change or creation to the revisions table
   * @param {ClassName} cls - Class of the data being changed
   * @param {Row} row - Row for the data being changed
   * @param {string} token - Session token for the user submitting the revision
   */
  async addChange (row, token, isMinor, tags = []) {
    let oldRow = await clsys.getItem(row.id)
    let id = row.id
    let created = false
    if (!oldRow) {
      if (!clsys.isStaticClass(row.cls)) {
        // figure out id of new item by seeing biggest serial
        id = (await sql.getBiggestSerial('items')) + 1
        created = true
      }
      oldRow = { data: clsys.getDefault(row.cls) }
    }
    const userId = await user.getUserId(token)

    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    await this.insertRev(row.cls, id, userId, delta, isMinor, created, tags)
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
  async insertRev (cls, itemId, user, patch = null, isMinor = false, created = false, tags = []) {
    if (patch) patch = JSON.stringify(patch)
    await sql.insert(
      'revisions',
      'cls, item_id, wiki_user, timestamp, patch, minor_edit, created, tags',
      [cls, itemId, user, Date.now(), patch, Number(isMinor), Number(created), Tagger.getTagString(...tags)]
    )
  }

  /**
   * Get what the data object for an item looked like AFTER a certain revision
   * @param {number} revId - Id of the revision
   * @returns {ItemData} What the data was
   */
  async getRevisionData (revId) {
    const row = await sql.selectId('revisions', revId)
    const itemId = row.item_id

    const revisions = (await sql.selectGreaterAndEqual('revisions', 'id', revId, 'item_id', itemId))

    const data = (await del.getItemIncludeDeleted(itemId)).data
    for (let i = 0; i < revisions.length; i++) {
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
    const cls = cur.cls
    const itemId = cur.item_id

    const previous = await sql.pool.query(`
    SELECT MIN(id)
    FROM revisions
    WHERE id > ${revId} AND cls = $1 AND item_id = $2
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
  async selectRevisions (id) {
    return (
      await sql.selectWithColumn(
        'revisions',
        'item_id',
        id
      )
    )
  }

  async rollback (user, item, token) {
    const revisions = await this.selectRevisions(item)
    const lastUserRevisions = []
    const lastRev = getLastElement(revisions)
    const isRollback = await (new Tagger(lastRev.id)).hasTag(1)
    if (isRollback) {
      lastUserRevisions.push(lastRev)
    } else {
      for (let i = revisions.length - 1; i >= 0; i--) {
        const revision = revisions[i]
        if (revision.wiki_user === user) {
          lastUserRevisions.push(revision)
        } else break
      }
    }

    const row = await clsys.getItem(item)
    if (getLastElement(lastUserRevisions).created) {
      await del.deleteItem(item, token, 0, 'Rollback')
    } else {
      for (let i = 0; i < lastUserRevisions.length; i++) {
        const revision = lastUserRevisions[i]
        row.data = jsondiffpatch.unpatch(row.data, revision.patch)
      }

      await this.addChange(row, token, true, [1])
      await clsys.updateItem(row)
    }
    for (let i = 0; i < lastUserRevisions.length; i++) {
      const revision = lastUserRevisions[i]
      const tagger = new Tagger(revision.id)
      await tagger.addTag(0)
    }
  }
}

module.exports = new RevisionHandler()
