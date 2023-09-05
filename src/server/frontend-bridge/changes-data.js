const Diff = require('diff')

const sql = require('../database/sql-handler')
const itemClassChanges = require('../item-class/item-class-changes')
const ItemClassDatabase = require('../item-class/item-class-database')
const { itemClassHandler } = require('../item-class/item-class-handler')

/** Class that generates data from the frontend that refers to items changing */
class ChangesData {
  /**
   * Get the size of a revision's `data`'s JSON string in bytes
   * @param {number} revId - Id of the revision (`data` is from AFTER the revision)
   * @returns {number} Size in bytes
   */
  static async checkRevisionSize (revId) {
    const text = JSON.stringify(await itemClassChanges.getRevisionData(revId))
    const encoder = new TextEncoder()
    return encoder.encode(text).length
  }

  /**
   * Create object with data for a deletion in a history viewer
   * @param {object} row - Row object for the deletion in the `deletion_log`
   * @param {string} name - Name of the item
   * @param {string} cls - Item's class name
   * @returns {object} Object with the data
   */
  static createDeletionInfo (row, name, cls) {
    return {
      deletionLog: true,
      deletion: row.is_deletion,
      timestamp: row.timestamp,
      cls,
      name,
      row,
      userId: row.wiki_user,
      id: row.item_id,
      tags: row.tags
    }
  }

  /**
   * Create object with data for a revision in a history viewer
   * @param {object} old - Row object for the previous revision
   * @param {object} cur - Row object for this revision
   * @param {number} delta - Size difference between revisions
   * @param {string} name - Name of the item
   * @param {string} className - Item's class name
   * @param {string} user - Name of the user who created the revision
   * @returns {object} Object with the data
   */
  static createRevisionInfo (old, cur, delta, name, className, user) {
    return {
      delta,
      timestamp: cur.timestamp,
      cls: className,
      name,
      old: old ? old.id : undefined,
      cur: cur.id,
      user,
      userId: cur.wiki_user,
      id: cur.item_id,
      tags: cur.tags
    }
  }

  /**
   * Get the last revisions in a time frame
   * @param {number} days - Number of days before today to include
   * @param {number} number - Maximum number of changes to include
   * @returns {object[]} Array where each object has data for a revision or deletion
   */
  static async getLastRevisions (days, number) {
    // days is converted to ms
    const timestamp = Date.now() - (days) * 86400000
    const revs = await sql.selectGreaterAndEqual('revisions', 'timestamp', timestamp)
    const dels = await sql.selectGreaterAndEqual('deletion_log', 'timestamp', timestamp)
    const rows = revs.concat(dels).sort((a, b) => {
      return b.timestamp - a.timestamp
    })
    const classes = itemClassHandler.classes
    const latest = []

    for (let i = 0; i < rows.length && i < number + 1; i++) {
      const row = rows[i]
      const name = await ItemClassDatabase.getQueryNameById(row.item_id)
      const cls = await ItemClassDatabase.getClass(row.item_id)
      const className = classes[cls].name
      if (row.is_deletion === undefined) {
        const next = await itemClassChanges.getNextRev(row.id)
        if (next) {
          const sizes = [row.id, next]
          for (let i = 0; i < 2; i++) {
            sizes[i] = await ChangesData.checkRevisionSize(sizes[i])
          }
          const nextRow = await sql.selectId('revisions', next)
          const delta = sizes[1] - sizes[0]
          const user = (await sql.selectId('wiki_users', nextRow.wiki_user)).name

          latest.push(ChangesData.createRevisionInfo(row, nextRow, delta, name, className, user))
        }
      } else {
        latest.push(ChangesData.createDeletionInfo(row, name, className))
      }

      if (row.created && row.timestamp > timestamp) {
        latest.push(ChangesData.createRevisionInfo(undefined, row, await ChangesData.checkRevisionSize(row.id), name, className, (await sql.selectId('wiki_users', row.wiki_user)).name))
      }
    }

    // add rollbackable changes
    const foundItems = []

    for (let i = 0; i < latest.length; i++) {
      const change = latest[i]
      if (!foundItems.includes(change.id)) {
        foundItems.push(change.id)
        if (!await ItemClassDatabase.isDeleted(change.id)) {
          latest[i].rollback = true
        }
      }
    }

    return latest
  }

  /**
   * Get the difference between two revisions
   * @param {ItemData} old - Data for the older revision
   * @param {ItemData} cur - Data for the newer revision
   * @returns {any[][]} An array where each element is an array containing the diff information
   */
  static getRevDiff (old, cur) {
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
}

module.exports = ChangesData
