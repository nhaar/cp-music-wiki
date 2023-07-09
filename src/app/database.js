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
        song_id INTEGER PRIMARY KEY AUTOINCREMENT
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS authors (
        author_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS song_names (
        song_id INTEGER,
        pos INTEGER,
        name_text TEXT,
        PRIMARY KEY (song_id, pos)
        FOREIGN KEY (song_id) REFERENCES songs(song_id)
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS song_author (
        song_id INTEGER,
        author_id INTEGER,
        pos INTEGER,
        PRIMARY KEY (song_id, pos),
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
  async createSong (name) {
    await this.runDatabaseMethod(callback => {
      this.db.run('INSERT INTO songs DEFAULT VALUES', [], callback)
    })
    // get automatically created song id from the sequence
    const seq = await this.runSelectMethod(callback => {
      this.db.get("SELECT * FROM sqlite_sequence WHERE name = 'songs'", [], callback)
    })
    const songId = seq.seq
    // insert default user-picked name
    this.db.run('INSERT INTO song_names (song_id, pos, name_text) VALUES (?, ?, ?)', [songId, 1, name])
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
   * @param {string} column - Name of the column (eg name)
   * @param {string} value - Value to search in the property
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getFromTable (table, column, value) {
    const row = await this.runSelectMethod(callback => {
      this.db.get(`SELECT * FROM ${table} WHERE ${column} = ?`, [value], callback)
    })
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
   * Asynchronously gets the data for a song based on its id
   * @param {string} songId
   * @returns {import('../public/scripts/editor').Song | null} Song object or null if doesn't exist
   */
  async getSongById (songId) {
    const authors = await deconstructRows(() => this.getSongAuthors(songId), 'author_id')
    const names = await deconstructRows(() => this.getSongNames(songId), 'name_text')
    const song = { names, authors }
    return song
  }

  /**
   * Asynchronously get the row for an author based on its id
   * @param {string} authorId
   * @returns {Row | null} Row info or null if doesn't exist
   */
  async getAuthorById (authorId) {
    const row = await this.getFromTable('authors', 'author_id', authorId)
    return row
  }

  /**
   * Updates a song
   * @param {import('../public/scripts/editor').Song} data - Song object with new data to be used
   */
  async updateSong (data) {
    const { names, songId } = data
    const authors = data.authors.map(n => Number(n))

    // authors
    this.updatePositionalTable('song_author', 'author_id', songId, authors, async songId => {
      const oldData = await this.getSongAuthors(songId)
      return oldData
    })

    // names
    this.updatePositionalTable('song_names', 'name_text', songId, names, async songId => {
      const oldData = await this.getSongNames(songId)
      return oldData
    })
  }

  /**
   * Helper function that updates a SQL table based on position
   * (containing song_id, pos, and another column)
   * @param {string} table - Table name
   * @param {string} dataColumn - Custom column name
   * @param {number} songId
   * @param {*[]} newData
   * The array of the data to match, each member of the array
   * must correspond to a position by its index and the array element
   * itself will be recorded in the custom column
   * @param {function(number) : *[]} getRowsFunction
   * Function that will take as argument the song id and will return the list
   * paralel to newData but before changes
   */
  async updatePositionalTable (table, dataColumn, songId, newData, getRowsFunction) {
    const oldData = await getRowsFunction(songId)
    if (oldData.length < newData.length) {
      for (let i = oldData.length; i < newData.length; i++) {
        this.db.run(`INSERT INTO ${table} (song_id, pos, ${dataColumn}) VALUES (?, ?, ?)`, [songId, i + 1, newData[i]])
      }
    } else if (oldData.length > newData.length) {
      for (let i = newData.length; i < oldData.length; i++) {
        this.db.run(`DELETE FROM ${table} WHERE song_id = ? AND pos = ?`, [songId, i + 1])
      }
    }

    for (let i = 0; i < newData.length && i < oldData.length; i++) {
      if (oldData[i][dataColumn] !== newData[i]) {
        this.db.run(`UPDATE ${table} SET ${dataColumn} = ? WHERE song_id = ? AND pos = ?`, [newData[i], songId, i + 1])
      }
    }
  }

  /**
   * Updates an author with a new row info
   * @param {Row} data - Row info with new data to be used
   */
  async updateAuthor (data) {
    const { name, authorId } = data
    const row = await this.getAuthorById(authorId)
    if (row.name !== name) {
      this.db.run('UPDATE authors SET name = ? WHERE author_id = ?', [name, authorId])
    }
  }

  /**
   * Gets an array with the rows of a positional table ordered for a single song
   * @param {number} songId
   * @param {string} table - Table name
   * @returns {Row[]} Array with all the rows ordered
   */
  async getSongPositionalValues (songId, table) {
    const relation = await this.runSelectMethod(callback => {
      this.db.all(`SELECT * FROM ${table} WHERE song_id = ? ORDER BY pos ASC`, [songId], callback)
    })
    return relation
  }

  /**
   * Get all the authors from a song in an ordered array
   * @param {string} songId
   * @returns {Row[]} Rows from song_author
   */
  async getSongAuthors (songId) {
    const authors = await this.getSongPositionalValues(songId, 'song_author')
    return authors
  }

  /**
   * Get all names from a song ordered
   * @param {string} songId
   * @returns {Row[]} All the name rows for a song ordered
   */
  async getSongNames (songId) {
    const names = await this.getSongPositionalValues(songId, 'song_names')
    return names
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
   * Get all authors that contains a keyword
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getAuthorNames (keyword) {
    const rows = await this.runSelectMethod(callback => {
      this.db.all("SELECT * FROM authors WHERE name LIKE '%' || ? || '%'", [keyword], callback)
    })
    return rows
  }

  /**
   * Runs an asynchronous SQL method automatically handling resolving and rejecting
   * the promise
   * @param {function(function) : *} methodCallback
   * A function that runs a sqlite3 method, taking as argument the callback
   * that is used in the third argument for the sqlite method
   * eg .run(*, *, callback)
   * @returns {*} Outcome of the method
   */
  async runDatabaseMethod (methodCallback) {
    return await new Promise((resolve, reject) => {
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
  }

  /**
   * Runs a certain SELECT method which returns data from the database
   * @param {function(function)} methodCallback
   * A function that runs .get or .all (to select from database)
   * and uses for its callback the argument being passed
   * @returns {Row | Row[]} - Single data row or multiple depending on method
   */
  async runSelectMethod (methodCallback) {
    const result = await this.runDatabaseMethod(methodCallback)
    return result
  }
}

/**
 * Helper function that creates an array
 * out of a column of a group of rows
 * @param {function() : Row[]} rowCallback
 * Function that will return all the rows we want to 'deconstruct'
 * @param {string} column Name of the column to save
 * @returns {string[]} Array with all the saved values
 */
async function deconstructRows (rowCallback, column) {
  const rows = await rowCallback()
  const values = []
  rows.forEach(row => {
    values.push(row[column])
  })

  return values
}

const db = new Database()

module.exports = db
