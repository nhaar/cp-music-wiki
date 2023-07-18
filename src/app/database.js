const path = require('path')
const { compareObjects, youtubify } = require('./utils')
const sqlite3 = require('sqlite3').verbose()

/**
 * Object containing information from a row
 * @typedef {object} Row
 */

/**
 * Class that handles the database
 */
class WikiDatabase {
  constructor () {
    this.db = new sqlite3.Database(path.join(__dirname, '../../database/database.db'))
  }

  /**
   * Creates the tables if they don't exist
   */
  async initializeDatabase () {
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
      `,
      `
        medias (
          media_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT
        )
      `,
      `
        features (
          feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          media_id INTEGER,
          release_date TEXT,
          is_date_estimate INTEGER
        )
      `,
      `
        song_feature (
          feature_id,
          media_id INTEGER,
          song_id INTEGER,
          use_release_date INTEGER,
          date TEXT,
          is_date_estimate INTEGER
        )
      `

    ]

    for (let i = 0; i < tables.length; i++) {
      this.createTable(tables[i])
    }
  }

  /**
   * Shorthand for creating a table if it doesn't exist
   * @param {string} command
   * Must be of the format "table name (...everything that goes into creating a table)"
   */
  async createTable (command) {
    await this.runDatabaseMethod(callback => {
      this.db.run('CREATE TABLE IF NOT EXISTS ' + command, [], callback)
    })
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

  async insertBlankGetId (table) {
    await this.runDatabaseMethod(callback => {
      this.db.run(`INSERT INTO ${table} DEFAULT VALUES`, [], callback)
    })

    const seq = await this.getFromTable('sqlite_sequence', 'name', table)

    return seq.seq
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
   * Get all rows from a table
   * @param {string} table
   * @returns {Row[]}
   */
  getAll = async table => this.runSelectMethod(callback => {
    this.db.all(`SELECT * FROM ${table}`, [], callback)
  })

  async getPropertyFromTable (table, property, column, value) {
    const row = await this.getFromTable(table, column, value)
    return row[property]
  }

  async getNameFromId (table, id) {
    const idName = {
      song_names: 'song_id',
      authors: 'author_id',
      collections: 'collection_id',
      medias: 'media_id',
      features: 'feature_id'
    }[table]

    const name = getNameColumn(table)
    const response = await this.getPropertyFromTable(table, name, idName, id)
    return response
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

    const medias = await this.getSongMedias(songId)

    const song = { names, authors, link, files, medias }
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

  async getFileById (fileId) {
    const row = await this.getFromTable('files', 'file_id', fileId)

    return {
      songId: row.song_id,
      collectionId: row.collection_id,
      filename: row.file_name,
      originalname: row.original_name
    }
  }

  getMediaById = async mediaId => await this.getFromTable('medias', 'media_id', mediaId)

  async getFeatureById (featureId) {
    const row = await this.getFromTable('features', 'feature_id', featureId)

    return {
      featureId,
      name: row.name,
      mediaId: row.media_id,
      releaseDate: row.release_date,
      isEstimate: Boolean(row.is_date_estimate)
    }
  }

  async update (type, data) {
    const relation = {
      song: a => this.updateSong(a),
      author: a => this.updateAuthor(a),
      collection: a => this.updateCollection(a),
      media: a => this.updateMedia(a),
      feature: a => this.updateFeature(a)
    }

    const response = await relation[type](data)
    return response
  }

  async updateBase (data, table, idName, callback) {
    const id = data[idName]
    if (!id || id === 'undefined') {
      data[idName] = await this.insertBlankGetId(table)
    }
    await callback(data)
  }

  /**
   * Updates a song
   * @param {import('../public/scripts/editor').Song} data - Song object with new data to be used
   */
  async updateSong (data) {
    await this.updateBase(data, 'songs', 'songId', async data => {
      const { songId, names, link, files, medias } = data
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

      // media info
      // compare previous and current to find differences
      const oldMedias = await this.getSongMedias(songId)
      const oldFeatures = this.getAllFeatures(oldMedias)
      const features = this.getAllFeatures(medias)
      const onlyOld = []
      const onlyNew = []
      const intersection = []
      oldFeatures.forEach(feature => {
        if (features.includes(feature)) intersection.push(feature)
        else onlyOld.push(feature)
      })
      features.forEach(feature => {
        if (!oldFeatures.includes(feature)) onlyNew.push(feature)
      })

      onlyOld.forEach(featureId => {
        this.db.run('DELETE FROM song_feature WHERE feature_id = ? AND song_id = ?', [featureId, songId])
      })
      const inverted = this.invertMedias(medias)
      const getFeature = (featureId, medias) => medias[inverted[featureId]][featureId]
      intersection.forEach(featureId => {
        const oldFeature = getFeature(featureId, oldMedias)
        const newFeature = getFeature(featureId, medias)
        const { releaseDate, date, isEstimate } = newFeature
        if (!compareObjects(oldFeature, newFeature)) {
          this.db.run('UPDATE song_feature SET use_release_date = ?, date = ?, is_date_estimate = ? WHERE feature_id = ? AND song_id = ?', [Number(releaseDate), date, Number(isEstimate), featureId, songId])
        }
      })
      onlyNew.forEach(featureId => {
        const mediaId = inverted[featureId]
        const feature = medias[mediaId][featureId]
        const { releaseDate, date, isEstimate } = feature
        this.db.run('INSERT INTO song_feature (media_id, feature_id, song_id, use_release_date, date, is_date_estimate) VALUES (?, ?, ?, ?, ?, ?)', [mediaId, featureId, songId, Number(releaseDate), date, Number(isEstimate)])
      })
    })
  }

  /**
   * Updates an author with a new row info
   * @param {Row} data - Row info with new data to be used
   */
  async updateAuthor (data) {
    await this.updateBase(data, 'authors', 'authorId', async data => {
      const { authorId, name } = data
      this.db.run('UPDATE authors SET name = ? WHERE author_id = ?', [name, authorId])
    })
  }

  /**
   * Update a collection with new info
   * @param {Row} data - New row info
   */
  async updateCollection (data) {
    await this.updateBase(data, 'collections', 'collectionId', async data => {
      const { name, collectionId } = data
      this.db.run('UPDATE collections SET name = ? WHERE collection_id = ?', [name, collectionId])
    })
  }

  /**
   * Create a new (music) file
   * @param {string} songId - Song the file belongs to
   * @param {string} collectionId - Collection the file belongs to
   * @param {string} originalName - Original file name from the user upload
   * @param {string} name - File name as is stored in the database
   */
  async updateFile (data) {
    await this.updateBase(data, 'files', 'fileId', async data => {
      const { songId, collectionId, originalname, filename, fileId } = data
      this.db.run('UPDATE files SET song_id = ?, collection_id = ?, original_name = ?, file_name = ? WHERE file_id = ?', [songId, collectionId, originalname, filename, fileId])
    })
  }

  async updateMedia (data) {
    await this.updateBase(data, 'medias', 'mediaId', data => {
      const { mediaId, name } = data
      this.db.run('UPDATE medias SET name = ? WHERE media_id = ?', [name, mediaId])
    })
  }

  /**
   * Adds a feature to the database given the data
   * @param {object} data
   * @param {string} data.name
   * @param {string} data.mediaId
   * @param {string} data.date
   * @param {boolean} data.isEstimate
   */
  async updateFeature (data) {
    await this.updateBase(data, 'features', 'featureId', async data => {
      const { featureId, name, mediaId, date, isEstimate } = data
      this.db.run('UPDATE features SET name = ?, media_id = ?, release_date = ?, is_date_estimate = ? WHERE feature_id = ?', [name, mediaId, date, isEstimate, featureId])
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
   * Gets the medias object for a song
   * @param {string} songId
   * @returns {import('../public/scripts/editor').Medias}
   */
  async getSongMedias (songId) {
    const medias = {}
    const rows = await this.runSelectMethod(callback => {
      this.db.all('SELECT * FROM song_feature WHERE song_id = ?', [songId], callback)
    })

    rows.forEach(row => {
      if (!medias[row.media_id]) medias[row.media_id] = {}
      medias[row.media_id][row.feature_id] = {
        releaseDate: row.use_release_date,
        date: row.date,
        isEstimate: row.is_date_estimate
      }
    })

    return medias
  }

  /**
   * Gets all the features that are being used inside a medias object
   * @param {import('../public/scripts/editor').Medias} medias
   * @returns {string} List of feature ids
   */
  getAllFeatures (medias) {
    const features = []
    for (const mediaId in medias) {
      for (const featureId in medias[mediaId]) {
        features.push(featureId)
      }
    }

    return features
  }

  /**
   * Convert a medias into an object that maps feature id to its media
   * @param {import('../public/scripts/editor').Medias} medias
   * @returns {object}
   */
  invertMedias (medias) {
    const inverted = {}
    for (const mediaId in medias) {
      for (const featureId in medias[mediaId]) {
        inverted[featureId] = mediaId
      }
    }

    return inverted
  }

  /**
   * Get the data object from a certain type and id
   * @param {string} type - Description of type
   * @param {string} id - Id of the data in the database
   * @returns {object} - Object representing the data type
   */
  async getDataById (type, id) {
    const relation = {
      song: async a => await this.getSongById(a),
      author: async a => await this.getAuthorById(a),
      collection: async a => await this.getCollectionById(a),
      file: async a => await this.getFileById(a),
      media: async a => await this.getMediaById(a),
      feature: async a => await this.getFeatureById(a)
    }

    const response = await relation[type](id)
    return response
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
   * Gets rows for a table based on filtering names by keyword
   * @param {string} table
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getByKeyword (table, keyword) {
    const column = getNameColumn(table)
    const rows = await this.selectLike(table, column, keyword)
    return rows
  }

  /**
   * Gets the rows for all features inside a media filtering the name by a keyword
   * @param {string} keyword
   * @param {string} mediaId
   * @returns {Row[]}
   */
  getFeatureInMedia = async (keyword, mediaId) => this.runDatabaseMethod(callback => {
    this.db.all("SELECT * FROM features WHERE name LIKE '%' || ? || '%' AND media_id = ?", [keyword, mediaId], callback)
  })

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

/**
 * Gets the name column for a table
 * @param {string} table
 * @returns {string}
 */
function getNameColumn (table) {
  switch (table) {
    case 'song_names': {
      return 'name_text'
    }
    case 'files': {
      return 'original_name'
    }
    default: {
      return 'name'
    }
  }
}

const db = new WikiDatabase()

module.exports = db
