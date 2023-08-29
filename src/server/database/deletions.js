const clsys = require('./class-system')
const sql = require('./sql-handler')
const user = require('./user')

class DeletionHandler {
  constructor () {
    sql.create(`
    deleted_items (
      id SERIAL PRIMARY KEY,
      cls TEXT,
      item_id INT,
      data JSONB,
      querywords TEXT
    )
  `)

    sql.create(`
    deletion_log (
      id SERIAL PRIMARY KEY,
      cls TEXT,
      item_id INT,
      wiki_user INT,
      timestamp NUMERIC,
      reason INT,
      additional_reason TEXT,
      is_deletion INT
    )
  `)
  }

  async deleteItem (id, token, reason, otherReason) {
    const row = await clsys.getItem(id)
    sql.delete('items', 'id', id)
    sql.insert('deleted_items', 'cls, item_id, data, querywords', [row.cls, id, JSON.stringify(row.data), row.querywords])
    this.insertDeletion(row, token, reason, otherReason, true)
  }

  async undeleteItem (id, reason, token) {
    const row = await this.getDeletedRow(id)
    sql.delete('deleted_items', 'id', row.id)
    sql.insert('items', 'id, cls, data, querywords', [id, row.cls, row.data, row.querywords])
    this.insertDeletion(id, token, null, reason, false)
  }

  async insertDeletion (row, token, reason, other, isDeletion) {
    await sql.insert(
      'deletion_log',
      'cls, item_id, wiki_user, timestamp, reason, additional_reason, is_deletion',
      [row.cls, row.id, (await user.getUserId(token)), Date.now(), reason, other, Number(isDeletion)]
    )
  }

  async getByName (cls, keyword) {
    const rows = await sql.selectLike('deleted_items', 'querywords', keyword, 'cls', cls)
    return clsys.getNameWithRows(rows.map(row => {
      return { id: row.item_id, querywords: row.querywords }
    }), keyword)
  }

  async getQueryNameById (id) {
    try {
      return (await this.getItemIncludeDeleted(id)).querywords.split('&&')[0]
    } catch (error) {
      return ''
    }
  }

  async getDeletedRow (id) {
    return (await sql.selectWithColumn('deleted_items', 'item_id', id))[0]
  }

  async getItemIncludeDeleted (id) {
    let row = await clsys.getItem(id)
    if (!row) {
      row = await this.getDeletedRow(id)
      row.id = row.item_id
    }
    return row
  }

  async isDeleted (id) {
    return Boolean(await this.getDeletedRow(id))
  }
}

module.exports = new DeletionHandler()
