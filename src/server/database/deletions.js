const clsys = require('./class-system')
const sql = require('./sql-handler')
const user = require('./user')

class DeletionHandler {
  constructor () {
    sql.create(`
    deleted_items (
      id SERIAL PRIMARY KEY,
      class TEXT,
      item_id INT,
      data JSONB,
      querywords TEXT
    )
  `)

    sql.create(`
    deletion_log (
      id SERIAL PRIMARY KEY,
      class TEXT,
      item_id INT,
      wiki_user INT,
      timestamp NUMERIC,
      reason INT,
      additional_reason TEXT,
      is_deletion INT
    )
  `)
  }

  async deleteItem (cls, id, token, reason, otherReason) {
    const row = await clsys.getItem(cls, id)
    sql.delete(cls, 'id', id)
    sql.insert('deleted_items', 'class, item_id, data, querywords', [cls, id, JSON.stringify(row.data), row.querywords])
    this.insertDeletion(cls, id, token, reason, otherReason, true)
  }

  async undeleteItem (cls, id, reason, token) {
    const row = await this.getDeletedRow(cls, id)
    sql.delete('deleted_items', 'id', row.id)
    sql.insert(cls, 'id, data, querywords', [id, row.data, row.querywords])
    this.insertDeletion(cls, id, token, null, reason, false)
  }

  async insertDeletion (cls, id, token, reason, other, isDeletion) {
    await sql.insert(
      'deletion_log',
      'class, item_id, wiki_user, timestamp, reason, additional_reason, is_deletion',
      [cls, id, (await user.getUserId(token)), Date.now(), reason, other, Number(isDeletion)]
    )
  }

  async getByName (cls, keyword) {
    const rows = await sql.selectLike('deleted_items', 'querywords', keyword)
    return clsys.getNameWithRows(rows.filter(row => row.class === cls).map(row => {
      return { id: row.item_id, querywords: row.querywords }
    }), keyword)
  }

  async getDeletedRow (cls, id) {
    const row = (await sql.selectAndEquals('deleted_items', 'class, item_id', [cls, id]))[0]
    return row
  }
}

module.exports = new DeletionHandler()
