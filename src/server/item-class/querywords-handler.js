const ObjectPathHandler = require('../misc/object-path-handler')
const { itemClassHandler } = require('./item-class-handler')

/**
 * Class that handles the `querywords` column
 *
 * `querywords` is a way to more quickly be able to find items by their name. The data is completely redundant to what
 * goes inside `data`, technically, but it makes it easily accessible for the SQL query
 *
 * The standard format for `querywords` are all the query strings separated by `&&`
 * */
class QuerywordsHandler {
  /** Initiate variables */
  constructor () {
    this.assignQueryIndex()
  }

  /** Assign query index to instance */
  assignQueryIndex () {
    /** Object that maps class names to array of `PropertyPath`s that lead to a `QUERY` property */
    this.queryIndex = itemClassHandler.findPaths(prop => prop.query)
  }

  /**
   * Get the `querywords` string from an item's `data`
   * @param {string} cls - Item class
   * @param {ItemData} data - Item data
   * @returns {string} `querywords` from the data
   */
  getQueryWords (cls, itemData) {
    if (itemClassHandler.isStaticClass(cls)) return null
    const found = []
    const paths = this.queryIndex[cls]

    paths.forEach(path => {
      found.push(...ObjectPathHandler.travelItemPath(path, itemData))
    })

    return found.join('&&')
  }
}

module.exports = new QuerywordsHandler()
