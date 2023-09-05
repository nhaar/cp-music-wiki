const { itemClassHandler } = require('./item-class-handler')
const sql = require('../database/sql-handler')
const { getName } = require('../misc/common-utils')

/** Class with methods to communicate with the item class related parts of the database */
class ItemClassDatabase {
  /** Initialize the tables so that they are useable as intended */
  static async initDatabase () {
    await sql.create(`
      items (
        id SERIAL PRIMARY KEY,
        cls TEXT,
        data JSONB,
        querywords TEXT,
        predefined INT
      )
    `)

    // table to save items that are deleted
    await sql.create(`
      deleted_items (
        id SERIAL PRIMARY KEY,
        cls TEXT,
        item_id INT,
        data JSONB,
        querywords TEXT
      )
    `)

    await sql.create(`
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

    // table to keep track of deletions
    await sql.create(`
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

    const allClasses = (await sql.selectAll('items')).map(row => row.cls)
    // add static classes if they don't exist
    for (const cls in itemClassHandler.staticClasses) {
      if (!allClasses.includes(cls)) {
        await ItemClassDatabase.insertItem(cls, itemClassHandler.defaults[cls])
      }
    }
    // add predefined items
    for (let i = 0; i < itemClassHandler.predef.length; i++) {
      const item = itemClassHandler.predef[i]
      if ((await sql.selectWithColumn('items', 'predefined', item.id)).length === 0) {
        await ItemClassDatabase.insertItem(item.cls, item.data, item.id)
      }
    }
  }

  /**
   * Create a new item and insert it into the databae
   * @param {string} cls - Item class
   * @param {ItemData} data - Initial item data
   * @param {number} predefined - Predefined item id, leave out for `null`
   */
  static async insertItem (cls, data, predefined = null) {
    await sql.insert(
      'items', 'cls, data, querywords, predefined',
      [cls, JSON.stringify(data), await this.getQueryWords(cls, data), predefined]
    )
  }

  /**
   * Check if an item is deleted or not
   * @param {number} id - Item id
   * @returns {boolean} `true` if item is deleted, `false` if not
   */
  static async isDeleted (id) {
    return Boolean(await ItemClassDatabase.getDeletedRow(id))
  }

  /**
   * Get the class an item belongs to
   * @param {number} id - Item id
   * @returns {string} Class name
   */
  static async getClass (id) {
    return (await ItemClassDatabase.getItem(id)).cls
  }

  /**
   * Check if an item is from a static class
   * @param {number} id - Item id
   * @returns {boolean} `true` if the item is static, `false` otherwise
   */
  static async isStaticItem (id) {
    return itemClassHandler.isStaticClass(await ItemClassDatabase.getClass(id))
  }

  /**
   * Get an item
   * @param {number} id - Item id
   * @returns {ItemRow} Item's row object
   */
  static async getItem (id) {
    let row = await ItemClassDatabase.getUndeletedItem(id)
    if (!row) {
      row = await ItemClassDatabase.getDeletedRow(id)
      row.id = row.item_id
    }
    return row
  }

  /**
   * Get an undeleted item
   * @param {number} id - Item id
   * @returns {ItemRow} Item's row object
   */
  static async getUndeletedItem (id) {
    return await sql.selectRowWithColumn('items', 'id', id)
  }

  /**
   * Get the row for a deleted item
   * @param {number} id - Item id
   * @returns {object} Row from the `deleted_items` table
   */
  static async getDeletedRow (id) {
    return await sql.selectRowWithColumn('deleted_items', 'item_id', id)
  }

  /**
   * Select all items in a class
   * @param {string} cls - Item class
   * @returns {ItemRow[]} All founds rows' objects
   */
  static async selectAllInClass (cls) {
    return sql.selectWithColumn('items', 'cls', cls)
  }

  /**
   * Get the row for a static class
   * @param {string} cls - Static class
   * @returns {ItemRow} Class' item row's object
   */
  static async getStaticClass (cls) {
    return (await ItemClassDatabase.selectAllInClass(cls))[0]
  }

  /**
   * Get the first name of an item, including deleted and not deleted items
   * @param {number} id - Item id
   * @returns {string} Found name, or empty string if no item was found
   */
  static async getQueryNameById (id) {
    try {
      return getName((await ItemClassDatabase.getItem(id)).querywords)
    } catch (error) {
      return ''
    }
  }
}

module.exports = ItemClassDatabase
