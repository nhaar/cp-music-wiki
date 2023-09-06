const { deepcopy } = require('../misc/common-utils')
const ObjectPathHandler = require('../misc/object-path-handler')
const ItemClassDatabase = require('./item-class-database')
const { itemClassHandler } = require('./item-class-handler')
const user = require('../database/user')

/** Class that handles filtering item changes made by users according to their permissions */
class ItemPermissionFilter {
  /**
   * Store user information
   * @param {ItemRow} row - Row being submitted by the user
   * @param {string} token - Session token sent by the user
   */
  constructor (row, token) {
    Object.assign(this, { row, token })
  }

  /** A map of all item classes to an array of `PropertyPath`s that lead to a property anyone can edit */
  static paths = itemClassHandler.findPaths(prop => prop.anyone)

  /**
   * Filter the changes submitted by the user according to their permission
   * @returns {ItemRow | number} Filtered item row, if the row can be submitted, or an error exit number (see `getNonAdminRow`)
   */
  async filterChanges () {
    if (await user.isAdmin(this.token)) {
      return this.row
    } else return await this.getNonAdminRow()
  }

  /**
   * Create a new item row preserving only the changes that anyone can make and discarding any other
   * @returns {ItemRow | number} New item row if the row data was proper, otherwise, returns `1` if the user is trying to create a new row, `2` if the user submitted a broken `data` object
   */
  async getNonAdminRow () {
    const oldRow = await ItemClassDatabase.getItem(this.row.id)
    if (oldRow === undefined) return 1
    const newRow = deepcopy(oldRow)
    const paths = ItemPermissionFilter.paths[this.row.cls]
      .map(path => ObjectPathHandler.getObjectPathsFromPropertyPath(path, newRow.data))
      .flat(1)
    for (let i = 0; i < paths.length; i++) {
      if (!ObjectPathHandler.transferValue(this.row.data, newRow.data, paths[i])) return 2
    }
    return newRow
  }
}

module.exports = ItemPermissionFilter
