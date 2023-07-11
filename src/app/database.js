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
    const tables = [
      `
        songs (
          song_id INTEGER PRIMARY KEY AUTOINCREMENT,
          link TEXT
        )
      `,
      `
        authors (
          author_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT
        )
      `,
      `
        song_names (
          song_id INTEGER,
          pos INTEGER,
          name_text TEXT,
          PRIMARY KEY (song_id, pos)
          FOREIGN KEY (song_id) REFERENCES songs(song_id)
        )
      `,
      `
        song_author (
          song_id INTEGER,
          author_id INTEGER,
          pos INTEGER,
          PRIMARY KEY (song_id, pos),
          FOREIGN KEY (song_id) REFERENCES songs(song_id)
          FOREIGN KEY (author_id) REFERENCES authors(author_id)
        )
      `,
      `
        collections (
          collection_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT
        )
      `,
      `
        files (
          file_id INTEGER PRIMARY KEY AUTOINCREMENT,
          song_id INTEGER,
          collection_id INTEGER,
          file_name TEXT,
          original_name TEXT,
          is_hq INTEGER
        )
      `
    ]

    tables.forEach(table => this.createTable(table))
  }

  /**
   * Shorthand for creating a table if it doesn't exist
   * @param {string} command
   * Must be of the format "table name (...everything that goes into creating a table)"
   */
  createTable (command) {
    this.db.run('CREATE TABLE IF NOT EXISTS ' + command)
  }

  /**
   * Shorthand for INSERT INTO ... (...) VALUES (...)
   * @param {string} command A command of of format "table (columns...)""
   * @param {*[]} values Array of values respective to each column
   */
  runInsert (command, values) {
    const questionMarks = values.map(() => '?')
    this.db.run(`INSERT INTO ${command} VALUES (${questionMarks})`, values, err => { if (err) throw err })
  }

  /**
   * Create a new value in a table only by a name property
   * @param {string} table - Name of the table
   * @param {string} name - Name to use
   */
  createByName (table, name) {
    this.runInsert(`${table} (name)`, [name])
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
    const seq = await this.getFromTable('sqlite_sequence', 'name', 'songs')

    const songId = seq.seq
    // insert default user-picked name
    this.runInsert('song_names (song_id, pos, name_text)', [songId, 1, name])
  }

  /**
   * Create a new author
   * @param {string} name - Name of the author
   */
  createAuthor (name) {
    this.createByName('authors', name)
  }

  /**
   * Create a new collection
   * @param {string} name
   */
  createCollection (name) {
    this.createByName('collections', name)
  }

  /**
   * Create a new (music) file
   * @param {string} songId - Song the file belongs to
   * @param {string} collectionId - Collection the file belongs to
   * @param {string} originalName - Original file name from the user upload
   * @param {string} name - File name as is stored in the database
   */
  createFile (songId, collectionId, originalName, name) {
    this.runInsert('files (song_id, collection_id, original_name, file_name)', [songId, collectionId, originalName, name])
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
    const row = await this.getSong('song_id', songId)
    const authors = await deconstructRows(() => this.getSongAuthors(songId), 'author_id')
    const names = await deconstructRows(() => this.getSongNames(songId), 'name_text')
    const link = row.link ? youtubify(row.link) : ''

    const files = {}
    const fileRows = await this.runSelectMethod(callback => {
      this.db.all('SELECT * FROM files WHERE song_id = ?', [songId], callback)
    })
    fileRows.forEach(row => {
      files[row.file_id] = Boolean(row.is_hq)
    })
    const song = { names, authors, link, files }
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
   * Asynchronously get the row for a collection
   * @param {string} collectionId
   * @returns {Row | null} Row or null if doesn't exist
   */
  async getCollectionById (collectionId) {
    const row = await this.getFromTable('collections', 'collection_id', collectionId)
    return row
  }

  /**
   * Updates a song
   * @param {import('../public/scripts/editor').Song} data - Song object with new data to be used
   */
  async updateSong (data) {
    const { names, songId, link, files } = data
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

    // link
    this.db.run(`UPDATE songs SET link = ? WHERE song_id = ${songId}`, [extractVideoCode(link)])

    // file hq info
    for (const fileId in files) {
      const isHQ = files[fileId] ? 1 : 0
      this.db.run('UPDATE files SET is_hq = ? WHERE song_id = ? AND file_id = ?', [isHQ, songId, fileId])
    }
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
        this.runInsert(`${table} (song_id, pos, ${dataColumn})`, [songId, i + 1, newData[i]])
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
   * Update a collection with new info
   * @param {Row} data - New row info
   */
  async updateCollection (data) {
    const { name, collectionId } = data
    const row = await this.getCollectionById(collectionId)
    if (row.name !== name) {
      this.db.run('UPDATE collections SET name = ? WHERE collection_id = ?', [name, collectionId])
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
      case 'collections': {
        const response = await this.getCollectionById(id)
        return response
      }
    }
  }

  /**
   * Shorthand for SELECT * FROM ... WHERE ... LIKE ...
   * @param {string} table - Table name
   * @param {*} column - Column name
   * @param {*} keyword - Keyword for column to be like
   * @returns {Row[]}
   */
  async selectLike (table, column, keyword) {
    const rows = await this.runSelectMethod(callback => {
      this.db.all(`SELECT * FROM ${table} WHERE ${column} LIKE '%' || ? || '%'`, [keyword], callback)
    })
    return rows
  }

  /**
   * Get all authors that contains a keyword
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getAuthorNames (keyword) {
    const rows = await this.selectLike('authors', 'name', keyword)
    return rows
  }

  /**
   * Get all songs that contain a keyword in the main name
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getSongMainNames (keyword) {
    const rows = await this.selectLike('song_names', 'name_text', keyword)
    return rows
  }

  /**
   * Get all collections that contain a keyword in the name
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getCollectionNames (keyword) {
    const rows = await this.selectLike('collections', 'name', keyword)
    return rows
  }

  /**
   * Get all file rows linked to a song
   * @param {string} songId
   * @returns {Row[]}
   */
  async getFileData (songId) {
    const rows = await this.runSelectMethod(callback => {
      this.db.all('SELECT * FROM files WHERE song_id = ?', [songId], callback)
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

/**
 * Transforms a youtube video code
 * into a shortened link
 * @param {string} videoCode
 * @returns {string} Shortened link
 */
function youtubify (videoCode) {
  return 'youtube.be/' + videoCode
}

/**
 * Transforms a youtube link/blank string
 * and gets either the video code or nothing
 * @param {string} link - Link string
 * @returns {string | null} Video code or null if blank
 */
function extractVideoCode (link) {
  if (link === '') return null

  if (link.includes('youtube')) return link.match('(?<=v=)[^&]+')[0]
  else return link.match('(?<=be/)[^&^?]+')[0]
}

const db = new Database()

module.exports = db
