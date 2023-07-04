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
      INSERT INTO songs (name) VALUES (?)
    `, [name], err => { if (err) throw err })
  }

  /**
   * Asynchronously gets the row for a song
   * @param {string} name - Name of the song
   * @returns {object | null} Object containing row info or null if song doesn't exist
   */
  async getSong (name) {
    const promise = new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM songs WHERE name = ?', [name], (err, row) => {
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
}

const db = new Database()

module.exports = db
