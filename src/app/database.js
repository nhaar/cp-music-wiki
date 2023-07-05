const path = require('path')
const sqlite3 = require('sqlite3').verbose()

/**
 * Object containing information from a row
 * @typedef {object} Row
 */

/**
 * Class that handles the database
 */
class Database {
  constructor () {
    this.db = new sqlite3.Database(path.join(__dirname, '../../database/database.db'))
  }

  /**
   * Creates the tables if they don't exist
   */
  initializeDatabase () {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS songs (
        name TEXT
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS authors (
        name TEXT
      )
  `)
  }

  /**
   * Create a new value in a table only by a name property
   * @param {string} table - Name of the table
   * @param {string} name - Name to use
   */
  createByName (table, name) {
    this.db.run(`
      INSERT INTO ${table} (name) VALUES (?)
    `, [name], err => { if (err) throw err })
  }

  /**
   * Create a new song
   * @param {string} name - Name of the song
   */
  createSong (name) {
    this.createByName('songs', name)
  }

  /**
   * Create a new author
   * @param {string} name - Name of the author
   */
  createAuthor (name) {
    this.createByName('authors', name)
  }

  /**
   * Asynchronously get the row in a table based on a property
   * @param {string} table - Name of the table
   * @param {string} property - Name of the property (eg name)
   * @param {string} value - Value to search in the property
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getFromTable (table, property, value) {
    const promise = new Promise((resolve, reject) => {
      this.db.get(`SELECT rowid, * FROM ${table} WHERE ${property} = ?`, [value], (err, row) => {
        if (err) reject(err)
        else {
          if (row) {
            resolve(row)
          } else {
            resolve(null)
          }
        }
      })
    })

    const row = await promise
    return row
  }

  /**
   * Asynchronously get a row from a table by row id
   * @param {string} table - Table name
   * @param {string} id - Row id to get
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getFromTableById (table, id) {
    const row = await this.getFromTable(table, 'rowid', id)
    return row
  }

  /**
   * Asynchronously gets the row for a song based on a property
   * @param {string} property - Name of the property (eg name)
   * @param {string} value - Value to search in the property
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getSong (property, value) {
    const row = await this.getFromTable('songs', property, value)
    return row
  }

  /**
   * Asynchronously gets the row for a song based on its name
   * @param {string} name - Name of the song
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getSongByName (name) {
    const row = await this.getSong('name', name)
    return row
  }

  /**
   * Asynchronously gets the row for a song based on its row id
   * @param {string} id - Row id of the song
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getSongById (id) {
    const row = await this.getSong('rowid', id)
    return row
  }

  /**
   * Asynchronously get the row for an author based on its row id
   * @param {string} id - Row id of the song
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getAuthorById (id) {
    const row = await this.getFromTableById('authors', id)
    return row
  }

  /**
   * Updates a song with a new row info
   * @param {Row} data - Row info with new data to be used
   */
  async updateSong (data) {
    const { name, rowid } = data
    const row = await this.getSongById(rowid)
    if (row.name !== name) {
      this.db.run('UPDATE songs SET name = ? WHERE rowid = ?', [name, rowid])
    }
  }

  /**
   * Updates an author with a new row info
   * @param {Row} data - Row info with new data to be used
   */
  async updateAuthor (data) {
    const { name, rowid } = data
    const row = await this.getAuthorById(rowid)
    if (row.name !== name) {
      this.db.run('UPDATE authors SET name = ? WHERE rowid = ?', [name, rowid])
    }
  }
}

const db = new Database()

module.exports = db
