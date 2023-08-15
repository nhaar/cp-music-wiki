const sql = require('./sql-handler')
const clsys = require('./class-system')
const user = require('./user')

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
}

module.exports = new RevisionHandler()
