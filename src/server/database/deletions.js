const clsys = require('./class-system')
const sql = require('./sql-handler')
const user = require('./user')

/** Class that handles deletions of items */
class DeletionHandler {
  /** Create tables if they don't exist */
  constructor () {
    // table to save items that are deleted
    sql.create(`
      deleted_items (
        id SERIAL PRIMARY KEY,
        cls TEXT,
        item_id INT,
        data JSONB,
        querywords TEXT
      )
    `)

    // table to keep track of deletions
    sql.create(`
    deletion_log (
      id SERIAL PRIMARY KEY,
      cls TEXT,
      item_id INT,
      wiki_user INT,
      timestamp NUMERIC,
      reason INT,
      additional_reason TEXT,
      is_deletion INT,
      tags TEXT
    )
  `)
  }

  /**
   * Delete an item from the database
   * @param {number} id - Item id
   * @param {string} token - Session token of the user performing deletion
   * @param {number} reason - Identifier for reason
   * @param {string} otherReason - String with other reason
   */
  async deleteItem (id, token, reason, otherReason) {
    const row = await clsys.getItem(id)
    sql.delete('items', 'id', id)
    sql.insert('deleted_items', 'cls, item_id, data, querywords', [row.cls, id, JSON.stringify(row.data), row.querywords])
    this.insertDeletion(row, token, reason, otherReason, true)
  }

  /**
   * Bring a deleted item back to normal status
   * @param {number} id - Item id
   * @param {string} reason - Reason for undeleting
   * @param {string} token - Session token for the user performing undeletion
   */
  async undeleteItem (id, reason, token) {
    const row = await this.getDeletedRow(id)
    sql.delete('deleted_items', 'id', row.id)
    sql.insert('items', 'id, cls, data, querywords', [id, row.cls, row.data, row.querywords])
    this.insertDeletion(id, token, null, reason, false)
  }

  /**
   * Add a deletion or undeletion into the deletion log
   * @param {ItemRow} row - Row to delete/undelete
   * @param {string} token - Session token for the user that performed the deletion/undeletion
   * @param {number} reason - Reason id
   * @param {string} other - Other reason text
   * @param {boolean} isDeletion - `true` if this log entry pertains to a deletion, `false` if it pertains to an undeletion
   */
  async insertDeletion (row, token, reason, other, isDeletion) {
    await sql.insert(
      'deletion_log',
      'cls, item_id, wiki_user, timestamp, reason, additional_reason, is_deletion',
      [row.cls, row.id, (await user.getUserId(token)), Date.now(), reason, other, Number(isDeletion)]
    )
  }

  /**
   * Get all deleted items filtering the name by a string
   * @param {string} cls - Item class
   * @param {string} keyword - Filtering string
   * @returns {object[]} List of all found items
   */
  async getByName (cls, keyword) {
    const rows = await sql.selectLike('deleted_items', 'querywords', keyword, 'cls', cls)
    return clsys.getNameWithRows(rows.map(row => {
      return { id: row.item_id, querywords: row.querywords }
    }), keyword)
  }

  /**
   * Get the class of an item, including deleted and not deleted items
   * @param {number} id - Item id
   * @returns {string} Item class name
   */
  async getClass (id) {
    return (await this.getItemIncludeDeleted(id)).cls
  }

  /**
   * Get the first name of an item, including deleted and not deleted items
   * @param {number} id - Item id
   * @returns {string} Found name, or empty string if no item was found
   */
  async getQueryNameById (id) {
    try {
      return (await this.getItemIncludeDeleted(id)).querywords.split('&&')[0]
    } catch (error) {
      return ''
    }
  }

  /**
   * Get the row for a deleted item
   * @param {number} id - Item id
   * @returns {object} Row from the `deleted_items` table
   */
  async getDeletedRow (id) {
    return await sql.selectRowWithColumn('deleted_items', 'item_id', id)
  }

  async getItemIncludeDeleted (id) {
    let row = await clsys.getItem(id)
    if (!row) {
      row = await this.getDeletedRow(id)
      row.id = row.item_id
    }
    return row
  }

  /**
   * Check if an item is deleted or not
   * @param {number} id - Item id
   * @returns {boolean} `true` if item is deleted, `false` if not
   */
  async isDeleted (id) {
    return Boolean(await this.getDeletedRow(id))
  }
}

module.exports = new DeletionHandler()
