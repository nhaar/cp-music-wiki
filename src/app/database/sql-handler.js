const { Pool } = require('pg')

const config = require('../../../config')

/**
 * Class that connects to the Postgres database and runs
 * the SQL queries
 */
class SQLHandler {
  /** Connects to the database */
  constructor () {
    this.pool = new Pool({
      user: config.user,
      password: config.password,
      database: 'musicwiki',
      port: config.pgport
    })

    /** Columns for main class tables */
    this.columns = 'data, querywords'
  }

  /**
   * Create a table if it doesn't exist
   * @param {string} query - A string that looks like `TABLENAME (...)` where the parenthesis is what would be in parenthesis in SQL
   */
  async create (query) { await this.pool.query(`CREATE TABLE IF NOT EXISTS ${query}`) }

  async selectGreater (table, column, value) {
    return (await this.pool.query(`SELECT * FROM ${table} WHERE ${column} > $1`, [value])).rows
  }

  /**
   * Select all rows from a table in which a column is equal to a value
   * @param {string} table - Name of the table
   * @param {string} column - Name of the column to look for
   * @param {string | number} value - Value for the column to match
   * @param {string} selecting - The columns to include, separated by commas, or leave blank for all columns
   * @returns {object[]} All the rows that match
   */
  async select (table, column, value, selecting = '*') {
    return (await this.pool.query(`SELECT ${selecting} FROM ${table} WHERE ${column} = $1`, [value])).rows
  }

  /**
   * Select all the revisions in chronological order tied to a class item and get one of its columns
   * @param {ClassName} cls - Name of the class of the item
   * @param {number} id - Id of item or 0 for static classes
   * @param {string} column - Name of the column to get
   * @returns {string[] | number[]} Array with all the column values
   */
  async selectRevisions (cls, id, column) {
    return ((await this.pool.query(`SELECT ${column} FROM revisions WHERE class = $1 AND item_id = $2 ORDER BY id ASC`, [cls, id])).rows)
      .map(change => change[column])
  }

  /**
   * Get all patches for a class item
   * @param {ClassName} cls - Name of the class
   * @param {number} id - Id of item or 0 for static classes
   * @returns {jsondiffpatch.DiffPatcher[]} Array with all the patches
   */
  async selectPatches (cls, id) {
    return await this.selectRevisions(cls, id, 'patch')
  }

  /**
   * Get all the patch ids for a class item
   * @param {ClassName} cls - Name of the class
   * @param {number} id - Id of item or 0 for static classes
   * @returns {number[]} Array with all the ids
   */
  async selectPatchIds (cls, id) {
    return await this.selectRevisions(cls, id, 'id')
  }

  /**
   * Select every row in a table
   * @param {string} table - Name of the table
   * @returns {object[]} All rows in the table
   */
  async selectAll (table) {
    return (await this.pool.query(`SELECT * FROM ${table}`)).rows
  }

  /**
   * Select the row matching an id in a table
   * @param {string} table - Name of the table
   * @param {number} id - Id of the row
   * @param {string} selecting - Columns to select, separated by commas, or leave blank for all columns
   * @returns {object} Row data matched
   */
  async selectId (table, id, selecting = '*') {
    return (await this.select(table, 'id', id, selecting))[0]
  }

  /**
   * Insert a row into a table
   * @param {string} table - Name of the table
   * @param {string} columns - Name of all the columns to insert, comma separated
   * @param {any[]} values - Array with all the values to be inserted in the same order as the columns are written
   */
  async insert (table, columns, values, condition = '') {
    return await this.pool.query(
      `INSERT INTO ${table} (${columns}) VALUES (${values.map((v, i) => `$${i + 1}`)}) ${condition}`, values
    )
  }

  /**
   * Insert a row into a table associated with a main class
   * @param {ClassName} cls - Name of the class
   * @param {ItemValues} values - Values for the type
   */
  insertData = async (cls, values) => {
    await this.insert(cls, this.columns, values, '')
  }

  /**
   * Update a row inside a table in which a column matches a value
   * @param {string} table - Name of the table
   * @param {string} setting - Name of all the columns to update, comma separated
   * @param {string} column - Name of the column to match
   * @param {any[]} values - Array where the first element is the value to be matched, and the other values are the ones to update each column in the order the columns are written
   */
  update = async (table, setting, column, values) => {
    await this.pool.query(
    `UPDATE ${table} SET ${setting.split(',').map((setter, i) => `${setter.trim()} = $${i + 2}`).join(', ')} WHERE ${column} = $1`, values
    )
  }

  /**
   * Update a row inside a table associated with a main class
   * @param {ClassName} cls - Name of the main class
   * @param {number} id - Id of the row to update
   * @param {ItemValues} values - Values to update
   */
  async updateData (cls, id, values) {
    await this.update(cls, this.columns, 'id', [id].concat(values))
  }

  /**
   * Select all rows in a table where a column is like a certain value
   * @param {string} table - Name of the table
   * @param {string} column - Name of the column to match the value
   * @param {string} matching - String to be matched
   * @returns {object[]}
   */
  selectLike = async (table, column, matching) => {
    return (await this.pool.query(`SELECT * FROM ${table} WHERE ${column} ILIKE $1`, [`%${matching}%`])).rows
  }

  /**
   * Get the biggest ID used in a table
   * @param {string} table - Name of the table
   * @returns {number} The biggest ID
   */
  async getBiggestSerial (table) {
    return Number((await this.pool.query(`SELECT last_value FROM ${table}_id_seq`)).rows[0].last_value)
  }

  /**
   * Delete a row in a table where a column matches a value
   * @param {string} table - Table name
   * @param {string} column - Column name
   * @param {any} value - Value to match in column
   */
  async delete (table, column, value) {
    await this.pool.query(`DELETE FROM ${table} WHERE ${column} = $1`, [value])
  }
}

module.exports = new SQLHandler()
