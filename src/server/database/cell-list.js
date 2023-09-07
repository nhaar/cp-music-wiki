const sql = require('./sql-handler')

/** Handles columns that store as their content a list in string format, separating */
class CellList {
  /**
   * Create the the instance linked to an element of a table named `table`, where the name of the column that serves as an
   * id is `idColumn`, the column that contains the list is `listColumn`, and with the value of `idColumn` being `id`
   * @param {string} table
   * @param {string} listColumn
   * @param {string} idColumn
   * @param {any} id
   */
  constructor (table, listColumn, idColumn, id) {
    Object.assign(this, { id, listColumn, idColumn, table })
  }

  /**
   * Get the list string from the arguments
   * @param  {...string} args - Arguments
   * @returns {string} List string
   */
  static getListString (...args) {
    return args.join('%')
  }

  /**
   * Get an array with the elements from the list string `listString`
   * @param {string} listString
   * @returns {string[]}
   */
  static getListArray (listString) {
    if (listString === '') return []
    return listString.split('%')
  }

  /**
   * Check if the table element linked to the instance contains the string `item`
   * @param {string} item
   * @returns {boolean} `true` if it includes the string, `false` otherwise
   */
  async hasItem (item) {
    const items = await this.getList()
    return items.includes(item)
  }

  /**
   * Update the instance's table element list string with an update function `updatefn`
   * @param {function(string[]) : string[]} updatefn - Takes as an argument the array of the old list and returns an array for
   * a new list
   */
  async updateList (updatefn) {
    const items = updatefn(await this.getList())
    await sql.update(this.table, this.listColumn, `${this.idColumn} = $1`, [CellList.getListString(...items)], [this.id])
  }

  /**
   * Get the list of items from the instance's table element
   * @returns {string[]}
   */
  async getList () {
    return CellList.getListArray(await sql.selectColumn(this.table, this.idColumn, this.id, this.listColumn) || '')
  }

  /**
   * Add `item` to this instance's table element
   * @param {string} item
   */
  async addItem (item) {
    await this.updateList(old => {
      old.push(item)
      return old
    })
  }

  /**
   * Remove all elements equal to `item` from this instance's table element
   * @param {string} item
   */
  async removeItem (item) {
    await this.updateList(old => {
      return old.filter(i => i !== item)
    })
  }
}

module.exports = CellList
