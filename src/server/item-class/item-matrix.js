// make distinction between matrix (2d) and array (1d)
// array is just going to be []
// matrix is going to be { values: [], rows: number, columns: number }

const { deepcopy } = require('../misc/common-utils')

/**
 * Class for the matrices used inside item's data objects
 */
class ItemMatrix {
  /**
   * Create a matrix from an array
   * @param {object} value - Can be either a nested array, in which case it must be the only argument, or a flat array, in which case the other two arguments must be provided
   * @param {number | undefined} rows - Number of rows in the matrix
   * @param {number | undefined} columns - Number of columns in the matrix
   */
  constructor (value, rows, columns) {
    if (rows === undefined) {
      Object.assign(this, ItemMatrix.fromNestedToFlat(value))
    } else {
      Object.assign(this, { value, rows, columns })
    }
  }

  /**
   * The nested array representation of the matrix
   */
  get nested () {
    return ItemMatrix.fromFlatToNested(this.value, this.rows, this.columns)
  }

  /**
   * Create an item matrix from a given size with default values
   * @param {number} rows - Number of rows
   * @param {number} columns - Number of columns
   * @param {any | function() : any} defaultValue - Default value for each element, or a function that returns the default value
   * @returns {ItemMatrix} The created matrix
   */
  static fromSize (rows, columns, defaultValue) {
    const nested = []
    for (let i = 0; i < rows; i++) {
      const newCol = []
      for (let j = 0; j < columns; j++) {
        const value = typeof (defaultValue) === 'function' ? defaultValue() : defaultValue
        newCol.push(value)
      }
      nested.push(newCol)
    }
    return new ItemMatrix(nested)
  }

  /**
   * Remove the last row from the matrix
   */
  removeRow () {
    if (this.rows > 0) {
      const nested = this.nested
      nested.pop()
      Object.assign(this, ItemMatrix.fromNestedToFlat(nested))
    }
    if (this.rows === 0) {
      this.columns = 0
    }
  }

  /**
   * Remove the last column from the matrix
   */
  removeColumn () {
    if (this.columns > 0) {
      const nested = this.nested
      for (let i = 0; i < this.rows; i++) {
        nested[i].pop()
      }
      Object.assign(this, ItemMatrix.fromNestedToFlat(nested))
    }
    if (this.columns === 0) {
      this.rows = 0
    }
  }

  /**
   * Insert a new row at the end of the matrix
   * @param {any[]} row - The row to insert
   */
  addRow (row) {
    if (this.columns === 0) {
      this.columns = 1
    }
    const nested = this.nested
    nested.push(row)
    Object.assign(this, ItemMatrix.fromNestedToFlat(nested))
  }

  /**
   * Insert a new column at the end of the matrix
   * @param {any[]} column - The column to insert
   */
  addColumn (column) {
    if (this.rows === 0) {
      this.addRow(column)
      return
    }
    const nested = this.nested
    for (let i = 0; i < this.rows; i++) {
      nested[i].push(column[i])
    }
    Object.assign(this, ItemMatrix.fromNestedToFlat(nested))
  }

  /**
   * Get the nested representation from a flat representation of a matrix
   * @param {array} flat - Flat array
   * @param {number} rows - Number of rows
   * @param {number} columns - Number of columns
   * @returns {array} Nested array
   */
  static fromFlatToNested (flat, rows, columns) {
    flat = deepcopy(flat)
    const nested = []
    for (let i = 0; i < rows; i++) {
      const subFlat = flat.splice(0, columns)
      nested.push(subFlat)
    }
    return nested
  }

  /**
   * Get the flat representation from a nested representation of a matrix
   * @param {array} nested - Nested array
   * @returns {object} - Object containing the keys `value` for the array, and `rows` and `columns` for the size
   */
  static fromNestedToFlat (nested) {
    return { value: nested.flat(Infinity), rows: nested.length, columns: (nested[0] && nested[0].length) || 0 }
  }
}

module.exports = ItemMatrix
