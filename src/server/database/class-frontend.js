const sql = require('./sql-handler')
const { deepcopy } = require('../misc/common-utils')
const { itemClassHandler } = require('../item-class/item-class-handler')
const ItemClassDatabase = require('../item-class/item-class-database')
const itemClassChanges = require('../item-class/item-class-changes')

class FrontendBridge {
  constructor () {
    // save variables that will be requested by the frontend
    this.createPreeditorData()
  }

  /**
   * Create the object that contains the information for the pre-editor,
   * which consists of an array of objects where each object
   * contains the class name, the pretty name and if the class is static
   * */
  async createPreeditorData () {
    this.preeditorData = []

    for (const cls in itemClassHandler.classes) {
      const isStatic = itemClassHandler.isStaticClass(cls)
      const data = { cls, name: itemClassHandler.classes[cls].name, isStatic }
      if (isStatic) {
        data.id = (await ItemClassDatabase.getStaticClass(cls)).id
      }
      this.preeditorData.push(data)
    }
  }

  async getDeleteData (id) {
    const cls = await ItemClassDatabase.getClass(id)

    const deleteData = deepcopy(itemClassHandler.classes[cls])
    deleteData.refs = await itemClassChanges.checkReferences(id)
    return deleteData
  }

  async checkRevisionSize (revId) {
    const text = JSON.stringify(await itemClassChanges.getRevisionData(revId))
    const encoder = new TextEncoder()
    return encoder.encode(text).length
  }

  createDeletionInfo (row, name, cls) {
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

  createRevisionInfo (old, cur, delta, name, className, user) {
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

  async getLastRevisions (days, number) {
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
            sizes[i] = await this.checkRevisionSize(sizes[i])
          }
          const nextRow = await sql.selectId('revisions', next)
          const delta = sizes[1] - sizes[0]
          const user = (await sql.selectId('wiki_users', nextRow.wiki_user)).name

          latest.push(this.createRevisionInfo(row, nextRow, delta, name, className, user))
        }
      } else {
        latest.push(this.createDeletionInfo(row, name, className))
      }

      if (row.created && row.timestamp > timestamp) {
        latest.push(this.createRevisionInfo(undefined, row, await this.checkRevisionSize(row.id), name, className, (await sql.selectId('wiki_users', row.wiki_user)).name))
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
}

module.exports = new FrontendBridge()
