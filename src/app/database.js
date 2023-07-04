const path = require('path')
const sqlite3 = require('sqlite3').verbose()

/**
 * Class that handles the database
 */
class Database {
  constructor () {
    this.db = new sqlite3.Database(path.join(__dirname, '../../database/database.db'))
  }

  /**
   * Creates the tables if they don't exists
   */
  initializeDatabase () {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS songs (
        name TEXT
      )
    `)
  }

  /**
   * Create a new song
   * @param {string} name - Name of the song
   */
  createSong (name) {
    this.db.run(`
      INSERT INTO songs (name) VALUeS (?)
    `, [name], err => { if (err) throw err })
  }
}

const db = new Database()

module.exports = db
