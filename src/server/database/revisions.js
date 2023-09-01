const jsondiffpatch = require('jsondiffpatch')
const Diff = require('diff')

const sql = require('./sql-handler')
const clsys = require('./class-system')
const user = require('./user')
const del = require('./deletions')
const { getLastElement } = require('../misc/server-utils')

/** Handles a revision's tags */
class Tagger {
  /** Build instance linked to revision */
  constructor (rev) {
    this.id = rev
  }

  /**
   * Get the tag string from a list of tags
   * @param  {...text} tags - Tags
   * @returns {string} Tags string
   */
  static getTagString (...tags) {
    return tags.join('%')
  }

  /**
   * Check if the instance's revision has a tag
   * @param {string} tag - Tag to find
   * @returns {boolean} `true` if it includes the tag, `false` otherwise
   */
  async hasTag (tag) {
    const tags = await this.getTags()
    return tags.split('%').includes(tag + '')
  }

  /**
   * Update the instance's revision tags with an update function
   * @param {function(string) : string} updatefn - Function that takes as an argument the tags text in the database and returns the new tags text
   */
  async updateTags (updatefn) {
    const tags = updatefn(await this.getTags())
    await sql.update('revisions', 'tags', 'id = $1', [tags], [this.id])
  }

  /**
   * Get the tags text from the instance's revision
   * @returns {}
   */
  async getTags () {
    return await sql.selectColumn('revisions', 'id', this.id, 'tags')
  }

  /**
   * Add a tag to this instance's revision
   * @param {text} tag - New tag
   */
  async addTag (tag) {
    await this.updateTags(old => {
      return `${old}%${tag}`
    })
  }

  /**
   * Remove a tag from this instance's revision
   * @param {text} tag - Tag to remove
   */
  async removeTag (tag) {
    if (typeof tag === 'string') tag = Number(tag)
    await this.updateTags(old => {
      return old.split('%').filter(t => Number(t) !== tag).join('%')
    })
  }
}

/** Class that handles revisions of items */
class RevisionHandler {
  /** Create the database if it doesn't exist */
  constructor () {
    sql.create(`
      revisions (
        id SERIAL PRIMARY KEY,
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
   * @param {Row} row - Row for the data being changed
   * @param {string} token - Session token for the user submitting the revision
   * @param {boolean} isMinor - Whether this revision is a minor edit or not
   * @param {text[]} tags - Array of tags to add to the revision
   */
  async addChange (row, token, isMinor, tags = []) {
    let oldRow = await clsys.getItem(row.id)
    let id = row.id
    let created = false
    if (!oldRow) {
      // figure out id of new item by seeing biggest serial
      id = (await sql.getBiggestSerial('items')) + 1
      created = true
      oldRow = { data: clsys.getDefault(row.cls) }
    }
    const userId = await user.getUserId(token)

    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    await this.insertRev(id, userId, delta, isMinor, created, tags)
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
      [itemId, user, Date.now(), patch, Number(isMinor), Number(created), Tagger.getTagString(...tags)]
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
        groups.push(['add', statement])
      }
    }

    return groups
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
        id
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
    const lastUser = revisions[0]
    const lastUserRevisions = []
    const lastRev = getLastElement(revisions)
    const isRollback = await (new Tagger(lastRev.id)).hasTag(1)
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

    const row = await clsys.getItem(item)
    // delete if first revision is a creation, else undo changes
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
