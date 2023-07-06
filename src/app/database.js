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

    this.db.run(`
      CREATE TABLE IF NOT EXISTS song_author (
        song_id INT,
        author_id INT,
        pos INT,
        PRIMARY KEY (song_id, author_id),
        FOREIGN KEY (song_id) REFERENCES songs(song_id)
        FOREIGN KEY (author_id) REFERENCES authors(author_id)
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
   * @param {string} column - Name of the property (eg name)
   * @param {string} value - Value to search in the property
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getFromTable (table, column, value) {
    const row = await this.runSelectMethod(callback => {
      this.db.get(`SELECT rowid, * FROM ${table} WHERE ${column} = ?`, [value], callback)
    })
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
   * Asynchronously gets the data for a song based on its row id
   * @param {string} id - Row id of the song
   * @returns {import('../public/scripts/editor').Song | null} Song object or null if doesn't exist
   */
  async getSongById (id) {
    const row = await this.getSong('rowid', id)
    const authorRows = await this.getSongAuthors(id)
    const authors = []
    authorRows.forEach(row => {
      authors.push(row.author_id)
    })
    const { name } = row
    const song = { name, authors }
    return song
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
   * Updates a song
   * @param {import('../public/scripts/editor').Song} data - Song object with new data to be used
   */
  async updateSong (data) {
    const { name, rowid, authors } = data
    const row = await this.getSongById(rowid)

    if (row.name !== name) {
      this.db.run('UPDATE songs SET name = ? WHERE rowid = ?', [name, rowid])
    }

    const authorRows = await this.getSongAuthors(rowid)
    if (authorRows.length < authors) {
      // check for adding
      for (let i = authorRows.length; i < authors.length; i++) {
        this.db.run('INSERT INTO song_author (song_id, author_id, pos) VALUES (?, ?, ?)', [rowid, authors[i], i + 1])
      }
    } else if (authorRows.length > authors) {
      // check for deletion
      for (let i = authors.length; i < authorRows.length; i++) {
        this.db.run('DELETE FROM song_author WHERE song_id = ?  AND author_id = ? AND pos = ?', [rowid, authorRows[i].author_id, i + 1])
      }
    }
    // check for editting authors
    for (let i = 0; i < authors.length && i < authorRows.length; i++) {
      if (authorRows[i].author_id !== Number(authors[i])) {
        this.db.run('UPDATE song_author SET author_id = ? WHERE song_id = ? AND author_id = ?', [authors[i], rowid, authorRows[i].author_id])
      }
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

  /**
   * Get all the authors from a song in an ordered array
   * @param {string} songId - Song id
   * @returns {Row[]} Rows from song_author
   */
  async getSongAuthors (songId) {
    const authors = await this.runSelectMethod(callback => {
      this.db.all('SELECT * FROM song_author WHERE song_id = ? ORDER BY pos ASC', [songId], callback)
    })
    return authors
  }

  /**
   * Get the data object from a certain type and id
   * @param {string} type - Description of type
   * @param {string} id - Id of the data in the database
   * @returns {object} - Object representing the data type
   */
  async getDataById (type, id) {
    switch (type) {
      case 'songs': {
        const response = await this.getSongById(id)
        return response
      }
      case 'authors': {
        const response = await this.getAuthorById(id)
        return response
      }
    }
  }

  /**
   * Runs a certain SELECT method which returns data from the database
   * @param {function(function)} methodCallback
   * A function that runs .get or .all (to select from database)
   * and uses for its callback the argument being passed
   * @returns {Row | Row[]} - Single data row or multiple depending on method
   */
  async runSelectMethod (methodCallback) {
    const result = await new Promise((resolve, reject) => {
      methodCallback((err, result) => {
        if (err) reject(err)
        else {
          if (result) {
            resolve(result)
          } else {
            resolve(null)
          }
        }
      })
    })

    return result
  }
}

const db = new Database()

module.exports = db
