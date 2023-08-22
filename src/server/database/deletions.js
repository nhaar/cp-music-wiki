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
      data JSONB
    )
  `)

    sql.create(`
    deletion_log (
      id SERIAL PRIMARY KEY,
      class TEXT,
      item_id INT,
      wiki_user INT,
      timestamp NUMERIC,
      deletion_reason INT,
      additional_reason TEXT
    )
  `)
  }

  async deleteItem (cls, id, token, reason, otherReason) {
    const row = await clsys.getItem(cls, id)
    sql.delete(cls, 'id', id)
    sql.insert('deleted_items', 'class, item_id, data', [cls, id, JSON.stringify(row.data)])
    sql.insert(
      'deletion_log',
      'class, item_id, wiki_user, timestamp, deletion_reason, additional_reason',
      [cls, id, (await user.getUserId(token)), Date.now(), reason, otherReason]
    )
  }
}

module.exports = new DeletionHandler()
