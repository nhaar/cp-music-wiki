const sql = require('../database/sql-handler')
const { getName } = require('../misc/common-utils')

/** Base object to build simple page generators that are based in a class */
module.exports = {
  /**
   * Get a method that returns all names from a class
   * @param {string} cls - Item class name
   * @returns {async function () : string[]} Asynchronous function that gets all the names
   */
  getGetter (cls) {
    return async () => {
      return (await sql.selectWithColumn('items', 'cls', cls)).map(row => getName(row.querywords))
    }
  },

  /**
   * Get a method that returns the data for rendering a class based page
   * @param {string} cls - Item class name
   * @returns {async function(string) : object} Asynchronous function that returns an object containing the item row and more info
   */
  getParser (cls) {
    return async (name) => {
      const row = (await sql.selectRegex('items', 'querywords', `^${name}(&&|$)`, 'cls', cls))[0] || {}
      return Object.assign(row, { categories: [], name })
    }
  }
}
