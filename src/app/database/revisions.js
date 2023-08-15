const sql = require('./sql-handler')
const clsys = require('./class-system')
const user = require('./user')

const Diff = require('diff')
const jsondiffpatch = require('jsondiffpatch')

class RevisionHandler {
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
    let oldRow
    const isStatic = clsys.isStaticClass(cls)
    if (isStatic) {
      oldRow = await clsys.getStatic(cls)
    } else {
      oldRow = await sql.selectId(cls, row.id)
    }
    if (!oldRow) {
      if (!isStatic) {
        // to add id to row object if creating new entry
        row.id = (await sql.getBiggestSerial(cls))
        // this property is for the updating function only
        row.isNew = true
      }
      oldRow = { data: clsys.defaults[cls] }
    }
    const userId = await user.getUserId(token)

    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    sql.insert(
      'revisions',
      'class, item_id, patch, wiki_user, timestamp',
      [cls, row.id, JSON.stringify(delta), userId, Date.now()]
    )
  }

  /**
   * Add a revision that represents an item deletion
   * @param {ClassName} cls - Class of the deleted item
   * @param {number} id - ID of the deleted item
   * @param {string} token - Session token for the user submitting the revision
   */
  async addDeletion (cls, id, token) {
    const userId = await user.getUserId(token)
    sql.insert(
      'revisions',
      'class, item_id, wiki_user, timestamp',
      [cls, id, userId, Date.now()]
    )
  }

  async getRevisionData (revId) {
    const row = await sql.selectId('revisions', revId)
    const cls = row.class
    const itemId = row.item_id

    const revisions = await sql.selectGreaterCondition('revisions', 'id', revId, 'class', cls, 'item_id', itemId)

    const data = (await clsys.getItemById(cls, itemId)).data
    for (let i = revisions.length - 1; i >= 0; i--) {
      jsondiffpatch.unpatch(data, revisions[i].patch)
    }

    console.log(data)
    return data
  }

  getRevDiff (old, cur) {
    const strs = [old, cur].map(data => JSON.stringify(data, null, 2))
    const diff = Diff.diffLines(...strs)

    const groups = []

    for (let i = 0; i < diff.length; i++) {
      const statement = diff[i]
      const next = diff[i + 1]
      if (statement.removed) {
        if (next.added) {
          i++
          groups.push(['removeadd', statement, next])
        } else {
          groups.push(['remove', statement])
        }
      } else if (statement.added) {
        if (next.removed) {
          i++
          groups.push(['addremove', statement, next])
        } else {
          groups.push(['add', statement])
        }
      }
    }

    return groups
  }
}

module.exports = new RevisionHandler()
