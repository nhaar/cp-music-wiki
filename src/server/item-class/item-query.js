const { getName } = require('../misc/common-utils')
const ItemClassDatabase = require('./item-class-database')
const sql = require('../database/sql-handler')

/**
 * An object mapping item ids to names
 * @typedef {Object.<string, string>} NameMap
 */

/** Class that handles searching items by their names from `querywords` */
class ItemQuery {
  /**
   * Get all rows that match a search query result in a given class
   * @param {string} cls - Item class to search
   * @param {string} keyword - String to match the search result
   * @returns {NameMap} Created map with results
   */
  static async getByName (cls, keyword, includeUndeleted = true, includeDeleted = false) {
    const rows = []
    if (includeUndeleted) {
      rows.push(...await sql.selectLike('items', 'querywords', keyword, 'cls', cls))
    }
    if (includeDeleted) {
      rows.push(
        ...(await sql.selectLike('deleted_items', 'querywords', keyword, 'cls', cls))
          .map(row => ({ id: row.item_id, querywords: row.querywords }))
      )
    }
    if (!includeUndeleted && !includeDeleted) throw new Error('Must search for something')

    return ItemQuery.getNameWithRows(rows, keyword)
  }

  /**
   * Search all items within an item row's object in which the name contains an expression and get a map of items ids to the
    name that matches it
   * @param {ItemRow[]} rows - Array with all item rows
   * @param {string} keyword - String to search in names
   * @returns {NameMap} Created map
   */
  static getNameWithRows (rows, keyword) {
    const results = {}
    rows.forEach(row => {
      const { id, querywords } = row
      const phrases = querywords.split('&&')
      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i]
        if (phrase.match(new RegExp(keyword, 'i'))) {
          results[id] = phrase
          break
        }
      }
    })
    return results
  }

  /**
   * Get the first name in the query words for a row based on the id of the row and its class
   * @param {number} id - Item id
   * @returns {string} First query word in the row, or empty if nothing was found
   */
  static async getQueryNameById (id) {
    try {
      return getName((await ItemClassDatabase.getItem(id)).querywords)
    } catch (err) {
      return ''
    }
  }
}

module.exports = ItemQuery
