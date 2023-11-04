const { Pool } = require('pg')

const config = require('../../../config')
const { trimSplit } = require('../misc/common-utils')

/**
 * Class that connects to the Postgres database and runs the SQL queries
 */
class SQLHandler {
  /** Connects to the database */
  constructor () {
    this.pool = new Pool({
      user: config.PG_USER,
      password: config.PG_PASSWORD,
      database: config.PG_DATABASE,
      port: config.PG_PORT
    })
  }

  /**
   * Create a table if it doesn't exist
   * @param {string} query - A regular SQL table create query, except instead of `CREATE TABLE tablename (...)`, only include `tablename (...)`
   */
  async create (query) { await this.pool.query(`CREATE TABLE IF NOT EXISTS ${query}`) }

  /**
   * Run the SELECT method in the connected database
   * @param {string} table - Table to select in
   * @param {string} condition - The SQL condition to be selected
   * @param {any[]} values - The values as they appear in the condition
   * @param {string} selecting - The columns to select, comma separated, leave blank for all
   * @param {string} extra - Extra SQL code, if any
   * @returns {object[]} All the selected rows
   */
  async select (table, condition, values = [], selecting = '*', extra = '') {
    return (await this.pool.query(
      `
        SELECT ${selecting}
        FROM ${table}
        ${this.getConditional(condition)}
        ${extra}
      `,
      values
    )).rows
  }

  /**
   * Select every row in a table
   * @param {string} table - Name of the table
   * @returns {object[]} All rows in the table
   */
  async selectAll (table) {
    return await this.select(table)
  }

  /**
   * Use select with the condition having all mentioned columns to be equal to a specified value, possibly ordering
   * by id
   * @param {string} table - Table to select in
   * @param {string} conditions - A string of all the columns to check, comma separated
   * @param {any[]} values - All the values the columns need to be equal to, in the order of `conditions`
   * @param {string} selecting - The columns to select, comma separated, leave blank for all
   * @param {boolean} order - `true` if the selected rows should be ordered by ascending id, `false` otherwise
   * @returns {object[]} All selected rows
   */
  async selectAndEquals (table, conditions, values, selecting, order = false) {
    return await this.select(table, this.getAndEquals(conditions), values, selecting, order ? 'ORDER BY id ASC' : '')
  }

  /**
   * Use select where a column is greater than a value and other columns need to be equal to certain values
   * and order by descending
   * @param {string} table - Table to select in
   * @param {string} greaterColumn - The column that needs to be greater than a value
   * @param {any} greaterValue - The value the column needs to be greater than
   * @param {string} equalColumns - A string of all the columns to check equality, comma separated
   * @param {any[]} equalValues - All the values that the columns need to be equal to, in the order of `equalColumns`
   * @returns {object[]} All selected rows
   */
  async selectGreaterAndEqual (table, greaterColumn, greaterValue, equalColumns = '', equalValues = []) {
    return await this.select(
      table,
      this.getAndCompares(
        `${greaterColumn} > ${trimSplit(equalColumns).map(col => `, ${col} =`)}`
      ), [greaterValue].concat(equalValues),
      '*',
      `ORDER BY ${greaterColumn} DESC`
    )
  }

  /**
   * Select all rows from a table in which a column is equal to a value
   * @param {string} table - Name of the table
   * @param {string} column - Name of the column to look for
   * @param {any} value - Value for the column to match
   * @param {string} selecting - The columns to include, separated by commas, or leave blank for all columns
   * @param {boolean} idSort - If `true`, the rows will be sorted by the `id` column
   * @returns {object[]} All the rows that match
   */
  async selectWithColumn (table, column, value, selecting, idSort) {
    if (!idSort) idSort = column === 'id'
    return await this.selectAndEquals(table, column, [value], selecting, idSort)
  }

  /**
   * Select a single row from a table in which a column is equal to a value
   * @param {string} table - Table
   * @param {string} column - Name of the column to check
   * @param {any} value - Value to match the column
   * @param {string} selecting - The columns to include, separated by commas, or leave out for al columns
   * @returns {object | undefined} Found row if it exists or `undefined` otherwise
   */
  async selectRowWithColumn (table, column, value, selecting) {
    return (await this.selectWithColumn(table, column, value, selecting))[0]
  }

  /**
   * Select the value of a column from a single row, searching the row that has a column that matches a value
   * @param {string} table - Table
   * @param {string} column - Name of the column to check the condition
   * @param {any} value - Value that the checking column needs to have
   * @param {string} selecting - Name of the column to extract the value
   * @returns {any | undefined} Found row's column value or `undefined` if nothing was found
   */
  async selectColumn (table, column, value, selecting) {
    const row = await this.selectRowWithColumn(table, column, value, selecting)
    return row && row[selecting]
  }

  async selectColumnValues (table, column, value, selecting) {
    return (await (this.selectWithColumn(table, column, value))).map(row => row[selecting])
  }

  /**
   * Select all rows where a column is like a value and another column is equal to another value
   * @param {string} table - Table name
   * @param {string} likeCol - Name of column that needs to be like value
   * @param {string} likeVal - Value the column that needs to be like
   * @param {string} matchCol - Name of column that needs to be equal to a value
   * @param {any} matchVal - Value of the column that needs to be equal
   * @returns {object[]} Found rows
   */
  selectLike = async (table, likeCol, likeVal, matchCol, matchVal) => {
    return await this.select(table, `${likeCol} ILIKE $1 AND ${matchCol} = $2`, [`%${likeVal}%`, matchVal])
  }

  /**
   * Select the row matching an id in a table
   * @param {string} table - Name of the table
   * @param {number} id - Id of the row
   * @param {string} selecting - Columns to select, separated by commas, or leave blank for all columns
   * @returns {object} Row data matched
   */
  async selectId (table, id, selecting) {
    return await this.selectRowWithColumn(table, 'id', id, selecting)
  }

  /**
   * Run the SQL method INSERT
   * @param {string} table - Name of the table to insert in
   * @param {string} columns - The name of the columns being inserted, comma separated
   * @param {any[]} values - The values to insert in the columns in the order they are written in `columns`
   * @param {string} conflict - The column to check for conflicts
   */
  async insert (table, columns, values, conflict) {
    const conflictional = conflict
      ? `ON CONFLICT (${conflict}) DO NOTHING`
      : ''
    await this.pool.query(
      `
        INSERT INTO ${table}
        (${columns})
        VALUES (${values.map((v, i) => `$${i + 1}`)})
        ${conflictional}
      `, values
    )
  }

  /**
   * Run the SQL method UPDATE in the database
   * @param {string} table - Table to update in
   * @param {string} setting - String of all columns to update, comma separated
   * @param {string} condition - The condition to filter the rows
   * @param {any[]} updateValues - All the values to update the column in the order they are written in `setting`
   * @param {any[]} conditionValues - All the values to use in `condition` in the order they appear
   */
  update = async (table, setting, condition, updateValues, conditionValues = []) => {
    const values = conditionValues.concat(updateValues)
    await this.pool.query(
    `
      UPDATE ${table}
      SET ${setting.split(',').map((setter, i) => `${setter.trim()} = $${i + 1 + conditionValues.length}`).join(', ')}
      ${this.getConditional(condition)}
    `, values
    )
  }

  /**
   * Update a row inside a table in which a column matches a value
   * @param {string} table - Name of the table
   * @param {string} setting - Name of all the columns to update, comma separated
   * @param {any[]} values - Array of values to update each column in the order the columns are written
   * @param {string} matchColumn - Name of the column to match
   * @param {any} matchValue - Value to match
  */
  async updateOneCondition (table, setting, values, matchColumn, matchValue) {
    await this.update(table, setting, this.getAndEquals(matchColumn), values, [matchValue])
  }

  /**
   * Update a row in a table that has the column id equal to a number
   * @param {string} table - Name of the table
   * @param {string} setting - Name of all the columns to update, comma separated
   * @param {any[]} values - Array of values to update each column in the order the columns are written
   * @param {number} id - Id of the row to update
   */
  async updateById (table, setting, values, id) {
    await this.updateOneCondition(table, setting, values, 'id', id)
  }

  /**
   * Get the biggest ID used in a table
   * @param {string} table - Name of the table
   * @returns {number} The biggest ID
   */
  async getBiggestSerial (table) {
    return Number((await this.select(`${table}_id_seq`, '', [], 'last_value'))[0].last_value)
  }

  /**
   * Delete a row in a table where a column matches a value
   * @param {string} table - Table name
   * @param {string} column - Column name
   * @param {any} value - Value to match in column
   */
  async delete (table, column, value) {
    await this.deleteAndEquals(table, column, [value])
  }

  /**
   * Delete all rows in a table named `table` where all columns in `columns` are equal to the respective values in `values`
   * @param {string} table
   * @param {string} columns - Column names separated by comma
   * @param {any[]} values - Values in the same order the columns appear
   */
  async deleteAndEquals (table, columns, values) {
    await this.pool.query(`DELETE FROM ${table} WHERE ${this.getAndEquals(columns, 0)}`, values)
  }

  /**
   * Select rows from a table where a first column is matched by a `RegExp` and a second column is equal to a value
   * @param {string} table - Table name
   * @param {string} column - First column
   * @param {string} pattern - String containing a `RegExp` to be matched
   * @param {string} matchCol - Second column
   * @param {any} matchValue - Value to match in second column
   * @returns {object[]} Found rows
   */
  async selectRegex (table, column, pattern, matchCol, matchValue) {
    return await this.select(table, `${column} ~ $1 AND  ${matchCol} = $2`, [pattern, matchValue])
  }

  /**
   * Get the proper `pg` condition that consists of `AND` separated conditions of the
   * format `column operator $n`, where `n` is an integer, `column` is a name of a column and `operator` is a comparison operator
   * @param {string} conditions - A comma separated list of conditions of the format `column operator`, where column is the name of the column and operator is any comparison operator
   * @param {number} start - The offset for the first `$n` number to be, eg if `start = 0` then it will start at `$1`
   * @returns {string} The string for the condition
   */
  getAndCompares (conditions, start = 0) {
    conditions = trimSplit(conditions)
    conditions.forEach((cond, i) => {
      conditions[i] = `${cond} $${i + 1 + start}`
    })
    return conditions.join(' AND ')
  }

  /**
   * Get a `pg` condition that consists of `AND` separated conditions of the format `column = $n`, where `column` is a name of a column and `n` is an integer
   * @param {string} conditions - The columns to compare, comma separated
   * @param {number} start - The offset for the first `$n` number to be, eg if `start = 0` then it will start at `$1`
   * @returns {string} The string for the condition
   */
  getAndEquals (conditions, start) {
    return this.getAndCompares(trimSplit(conditions).map(cond => `${cond} = `).join(', '), start)
  }

  /**
   * Get a SQL conditional based on a condition
   * @param {string} condition - String to be tested, or blank if no condition
   * @returns {string} Valid conditional based on the input
   */
  getConditional (condition) {
    return condition
      ? `WHERE ${condition}`
      : ''
  }
}

module.exports = new SQLHandler()
