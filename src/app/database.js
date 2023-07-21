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
          reference_id INTEGER,
          pt_name TEXT,
          pt_reference_id INTEGER,
          pt_translation_notes TEXT,
          fr_name TEXT,
          fr_reference_id INTEGER,
          fr_translation_notes TEXT,
          es_name TEXT,
          es_reference_id INTEGER,
          es_translation_notes TEXT,
          de_name TEXT,
          de_reference_id INTEGER,
          de_translation_notes TEXT,
          ru_name TEXT,
          ru_reference_id INTEGER,
          ru_translation_notes TEXT,
          PRIMARY KEY (song_id, pos)
          FOREIGN KEY (song_id) REFERENCES songs(song_id)
        )
      `,
      `
        unnoficial_names (
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
          reference_id, INTEGER,
          PRIMARY KEY (song_id, pos),
          FOREIGN KEY (song_id) REFERENCES songs(song_id)
          FOREIGN KEY (author_id) REFERENCES authors(author_id)
        )
      `,
      `
        sources (
          source_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT
        )
      `,
      `
        files (
          file_id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER,
          song_id INTEGER,
          song_pos INTEGER,
          file_name TEXT,
          original_name TEXT,
          source_link TEXT,
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
        flash_rooms (
          room_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          release_date TEXT,
          is_release_estimate INTEGER,
          closure_date TEXT,
          is_closure_estimate INTEGER
        )
      `,
      `
        room_song (
          room_id INTEGER PRIMARY KEY AUTOINCREMENT,
          pos INTEGER,
          is_unused INTEGER,
          date_start TEXT,
          is_start_estimate INTEGER,
          date_end TEXT,
          is_end_estimate INTEGER,
          song_id INTEGER
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
      `,
      `
        wiki_references (
          reference_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          description TEXT,
          link TEXT
        )
      `
    ]

    tables.forEach(command => {
      this.createTable(command)
    })
  }

  /**
   * Shorthand for creating a table if it doesn't exist
   * @param {string} command
   * Must be of the format "table name (...everything that goes into creating a table)"
   */
  createTable = async (command) => await this.runDatabaseMethod(callback => this.db.run(`CREATE TABLE IF NOT EXISTS ${command}`, [], callback))

  /**
   * Shorthand for INSERT INTO ... (...) VALUES (...)
   * @param {string} command A command of of format "table (columns...)""
   * @param {*[]} values Array of values respective to each column
   */
  async runInsert (command, values) {
    const questionMarks = values.map(() => '?')
    await this.runDatabaseMethod(callback => this.db.run(`INSERT INTO ${command} VALUES (${questionMarks})`, values, callback))
  }

  insertDefault = async (table) => await this.runDatabaseMethod(callback => this.db.run(`INSERT INTO ${table} DEFAULT VALUES`, [], callback))

  async insertBlankGetId (table) {
    await this.insertDefault(table)
    const seq = await this.getTableCell('sqlite_sequence', 'name', table, 'seq')
    return seq
  }

  async getTableCell (table, column, value, targetColumn) {
    const row = await this.getFromTable(table, column, value)
    if (!row) return null
    return row[targetColumn]
  }

  /**
   * Asynchronously get the row in a table based on a property
   * @param {string} table - Name of the table
   * @param {string} column - Name of the column (eg name)
   * @param {string} value - Value to search in the property
   * @returns {Row | null} Row info or null if doesn't exist
   */
  getFromTable = async (table, column, value) => await this.get(table, `${column} = ?`, [value])

  /**
   * Get all rows from a table
   * @param {string} table
   * @returns {Row[]}
   */
  getAll = async table => this.runSelectMethod(callback => {
    this.db.all(`SELECT * FROM ${table}`, [], callback)
  })

  selectBase = async (method, table, condition, values, columns) => await this.runSelectMethod(
    callback => method(`SELECT ${columns} FROM ${table} WHERE ${condition}`, values, callback)
  )

  all = async (table, condition, values, columns = '*') => await this.selectBase((x, y, z) => this.db.all(x, y, z), table, condition, values, columns)

  get = async (table, condition, values, columns = '*') => await this.selectBase((x, y, z) => this.db.get(x, y, z), table, condition, values, columns)

  allOrdered = async (table, condition, orderColumn, values, columns = '*') => await this.all(table, `${condition} ORDER BY ${orderColumn} ASC`, values, columns)

  /**
   * Asynchronously gets the data for a song based on its id
   * @param {string} songId
   * @returns {import('../public/scripts/editor').Song | null} Song object or null if doesn't exist
   */
  async getSongById (songId) {
    const row = await this.get('songs', 'song_id = ?', [songId])

    // names
    const names = await this.callAsyncResult(() => this.allOrderedBySong(songId, 'song_names'),
      rows => rows.map(row => {
        const name = {
          name: row.name_text,
          referenceId: row.reference_id
        }
        const codes = ['pt', 'fr', 'es', 'de', 'ru']
        codes.forEach(code => {
          Object.assign(name, {
            [code]: {
              name: row[code + '_name'],
              referenceId: row[code + '_reference_id'],
              translationNotes: row[code + '_translation_notes']
            }
          })
        })
        return name
      })
    )

    let referenceIdNames = []
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      referenceIdNames.push(name.referenceId)

      const codes = ['pt', 'fr', 'es', 'de', 'ru']
      for (let j = 0; j < codes.length; j++) {
        const code = codes[j]
        referenceIdNames.push(name[code].referenceId)
      }
    }

    // authors
    let authorIdNames = []
    const authors = await this.callAsyncResult(() => this.allOrderedBySong(songId, 'song_author'),
      rows => rows.map(row => {
        const authorId = row.author_id
        const referenceId = row.reference_id
        referenceIdNames.push(authorId)
        authorIdNames.push(authorId)
        return { authorId, referenceId }
      })
    )

    // link
    const link = row.link ? youtubify(row.link) : ''

    // files and metada
    const fileRows = await this.allOrdered('files', 'song_id = ?', 'song_pos', [songId])
    const files = []
    const fileNames = {}
    const fileOriginalNames = {}
    fileRows.forEach(row => {
      const fileId = row.file_id
      files.push(fileId)
      fileNames[fileId] = row.file_name
      fileOriginalNames[fileId] = row.original_name
    })

    authorIdNames = removeDuplicates(authorIdNames)
    referenceIdNames = removeDuplicates(referenceIdNames)

    console.log('referenceeeeeeee', referenceIdNames)

    const referenceNames = await this.mapIdToValue(referenceIdNames, 'wiki_references', 'reference_id', 'name')
    const authorNames = await this.mapIdToValue(authorIdNames, 'authors', 'author_id', 'name')

    const song = { names, authors, link, files, meta: { fileNames, fileOriginalNames, authorNames, referenceNames } }
    return song
  }

  async mapIdToValue (ids, table, idName, nameColumn) {
    const map = {}
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      console.log('iiiiiiii', ids[i])
      const name = await this.getTableCell(table, idName, id, nameColumn)
      console.log(name)
      map[id] = name
    }
    return map
  }

  /**
   * Asynchronously get the row for an author based on its id
   * @param {string} authorId
   * @returns {Row | null} Row info or null if doesn't exist
   */

  getAuthorById = async authorId => await this.callAsyncResult(
    () => this.getFromTable('authors', 'author_id', authorId),
    row => ({ authorId, name: row.name })
  )

  /**
   * Asynchronously get the row for a source
   * @param {string} sourceId
   * @returns {import('../public/scripts/file').FileData | null} Row or null if doesn't exist
   */
  getSourceById = async sourceId => await this.callAsyncResult(
    () => this.getFromTable('sources', 'source_id', sourceId),
    row => ({ sourceId, name: row.name })
  )

  /**
   * Asynchronously run a select SQLITE method with the .get method
   * @param {string} command - The SQL code to run
   * @param {*[]} values - Array of values to use
   */

  /**
   * Gets the file data for a file id
   * @param {number} fileId
   * @returns {import('../public/scripts/file').FileData}
   */
  async getFileById (fileId) {
    const row = await this.getFromTable('files', 'file_id', fileId)
    const songName = await this.getTableCell('song_names', 'song_id', row.song_id, 'name_text')
    const sourceName = await this.getTableCell('sources', 'source_id', row.source_id, 'name')

    return {
      sourceId: row.source_id,
      filename: row.file_name,
      originalname: row.original_name,
      sourceLink: row.source_link,
      isHQ: Boolean(row.is_hq),
      meta: { songId: row.song_id, songName: songName.name_text, sourceName: sourceName.name }
    }
  }

  /**
   * Get a reference's data from the database
   * @param {string} referenceId
   * @returns {import('../public/scripts/reference').ReferenceData}
   */
  getReferenceById = async referenceId => await this.callAsyncResult(
    () => this.getFromTable('wiki_references', 'reference_id', referenceId),
    row => ({
      referenceId,
      name: row.name,
      link: row.link,
      description: row.description
    })
  )

  async getFlashRoomById (roomId) {
    const row = await this.getFromTable('flash_rooms', 'room_id', roomId)
    const useRows = await this.allOrdered('room_song', 'room_id = ?', 'pos', [roomId])

    const data = {
      name: row.name,
      releaseDate: row.release_date,
      isReleaseEstimate: row.is_release_estimate,
      closureDate: row.closureDate,
      isClosureEstimate: row.isClosureEstimate,
      songUses: []
    }
    for (let i = 0; i < useRows.length; i++) {
      const row = useRows[i]
      const songName = await this.getTableCell('song_names', 'song_id', row.song_id, 'name_text')
      data.songUses.push({
        songId: row.song_id,
        isUnused: row.is_unused,
        startDate: row.start_date,
        isStartEstimate: row.is_start_estimate,
        endDate: row.end_date,
        isEndEstimate: row.is_end_estimate,
        meta: { songName }
      })
    }

    return data
  }

  typeMethods = {
    song: {
      get: x => this.getSongById(x),
      update: (x, y) => this.updateSong(x, y)
    },
    author: {
      get: x => this.getAuthorById(x),
      update: x => this.updateAuthor(x)
    },
    source: {
      get: x => this.getSourceById(x),
      update: x => this.updateSource(x)
    },
    reference: {
      get: x => this.getReferenceById(x),
      update: x => this.updateReference(x)
    },
    'flash-room': {
      get: x => this.getFlashRoomById(x),
      update: x => this.updateFlashRoom(x)
    }
  }

  updateType = async (type, data) => await this.typeMethods[type].update(data, type)

  /**
   * Get the data object from a certain type and id
   * @param {string} type - Description of type
   * @param {string} id - Id of the data in the database
   * @returns {object} - Object representing the data type
   */
  getDataById = async (type, id) => await this.typeMethods[type].get(id)

  update = async (table, setting, condition, values) => await this.runDatabaseMethod(callback => 
    this.db.run(`UPDATE ${table} SET ${setting} WHERE ${condition}`, values, callback)
  )

  delete = async (table, condition, values) => await this.runDatabaseMethod(callback => {
    this.db.run(`DELETE ${table} WHERE ${condition}`, values, callback)
  })

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
  updateSong = async (data, type) => await this.updateBase(data, 'songs', 'songId', async data => {
    const { songId, names, authors, link, files } = data
    const oldData = await this.typeMethods[type].get(songId)
    console.log(names)
    // authors
    this.updateSongAuthors(songId, authors, oldData.authors)

    // names
    this.updateNames(songId, names, oldData.names)

    // link
    this.update('songs', 'link = ?', 'song_id = ?', [extractVideoCode(link), songId])

    // update file orders
    files.forEach((file, i) => this.update('files', 'song_pos = ?', 'file_id = ?', [i + 1, file]))
  })

  updateAuthor = async (data) => await this.updateBase(data, 'authors', 'authorId', async data => {
    const { authorId, name } = data
    console.log(name, authorId)
    this.update('authors', 'name = ?', 'author_id = ?', [name, authorId])
  })
  /**
   * Updates an author with a new row info
   * @param {Row} data - Row info with new data to be used
   */

  /**
   * Update a source with new info
   * @param {Row} data - New row info
   */

  updateSource = async (data) => await this.updateBase(data, 'sources', 'sourceId', async data => {
    const { sourceId, name } = data
    this.update('sources', 'name = ?', 'source_id = ?', [name, sourceId])
  })

  /**
   * Create a new (music) file
   * @param {string} songId - Song the file belongs to
   * @param {string} sourceId - Source the file belongs to
   * @param {string} originalName - Original file name from the user upload
   * @param {string} name - File name as is stored in the database
   */
  updateFile = async (data) => await this.updateBase(data, 'files', 'fileId', async data => {
    const { meta, sourceId, originalname, filename, fileId, sourceLink, isHQ } = data
    console.log('file', data)
    this.update(
      'files',
      'song_id = ?, source_id = ?, original_name = ?, file_name = ?, source_link = ?, is_hq = ?',
      'file_id = ?',
      [meta.songId, sourceId, originalname, filename, sourceLink, Number(isHQ), fileId]
    )
  })

  /**
   * Update a reference in the database
   * @param {import('../public/scripts/reference').ReferenceData} data
   */

  updateReference = async (data) => await this.updateBase(data, 'wiki_references', 'referenceId', async data => {
    const { referenceId, name, link, description } = data
    this.update(
      'wiki_references',
      'name = ?, link = ?, description = ?',
      'reference_id = ?',
      [name, link, description, referenceId]
    )
  })

  async updateFlashRoom (data) {
    await this.updateBase(data, 'flash_rooms', 'roomId', async data => {
      const { roomId, name, releaseDate, isReleaseEstimate, closureDate, isClosureEstimate, songUses } = data
      this.update(
        'flash_rooms',
        'release_date = ?, is_release_estimate = ?, closure_date = ?, is_closure_estimate = ?',
        'room_id = ?', [name, releaseDate, isReleaseEstimate, closureDate, isClosureEstimate, roomId]
      )

      const oldData = await this.getRoomSongUses(roomId)
      await this.updatePositionalSimpleCallback(
        oldData, songUses, roomId, 'room_song',
        ['is_unused', 'date_start', 'is_start_estimate', 'date_end', 'is_end_estimate'],
        ['isUnused', 'dateStart', 'isStartEstimate', 'dateEnd', 'isEndEstimate', 'songId'],
        'room_id', 'pos', (oldData, newData, i) => compareObjects(oldData[i], newData[i])
      )
    })
  }

  /**
   * Updates the list of authors for a song
   * @param {number} songId
   * @param {import('../public/scripts/author').AuthorData[]} newData
   */
  async updateSongAuthors (songId, newData, oldData) {
    const comparisonCallback = (oldData, newData, i) => !compareObjects(oldData[i], newData[i])
    await this.updatePositionalSimpleCallback(oldData, newData, songId, 'song_author', ['author_id', 'reference_id'], ['authorId', 'referenceId'], 'song_id', 'pos', comparisonCallback)
  }

  async updatePositionalSimpleCallback (oldData, newData, id, table, valueNames, propertyNames, idName, posName, comparisonCallback) {
    await this.updatePositionalTableBase(
      oldData, newData, id, table, valueNames,
      propertyNames.map(name => (data => data[name])),
      idName, posName, comparisonCallback
    )
  }

  async updatePositionalTableBase (oldData, newData, id, table, valueNames, valueCallbacks, idName, posName, comparisonCallback) {
    console.log(valueCallbacks)
    valueNames = valueNames
    const condition = `${idName} = ? AND ${posName} = ?`
    const getValues = i => {
      const data = newData[i]
      return valueCallbacks.map(callback => callback(data)).concat([id, i + 1])
    }

    if (oldData.length < newData.length) {
      for (let i = oldData.length; i < newData.length; i++) {
        const insertVariables = valueNames.concat([idName, posName]).join(', ')
        const values = getValues(i)
        this.runInsert(`${table} (${insertVariables})`, values)
      }
    } else if (oldData.length > newData.length) {
      for (let i = newData.length; i < oldData.length; i++) {
        this.delete(table, condition, [id, i + 1])
      }
    }

    for (let i = 0; i < newData.length && i < oldData.length; i++) {
      if (comparisonCallback(oldData, newData, i)) {
        const settingVariables = valueNames.map(name => `${name} = ?`).join(', ')
        const values = getValues(i)
        console.log('kkkkkkkkkkkkkkkk', table, settingVariables, condition, values)

        this.update(table, settingVariables, condition, values)
      }
    }
  }

  /**
   * Saves all the names of a song into the database
   * @param {string} songId
   * @param {import('../public/scripts/song').Name} newData
   */
  async updateNames (songId, newData, oldData) {
    const langCodes = ['pt', 'fr', 'es', 'de', 'ru']

    const valueNames = ['name_text', 'reference_id']
    const sqlVariables = ['name', 'reference_id', 'translation_notes']
    langCodes.forEach(code => {
      sqlVariables.forEach(variable => valueNames.push(`${code}_${variable}`))
    })
    const valueCallbacks = ['name', 'referenceId'].map(variable => (data => data[variable]))
    const variables = ['name', 'referenceId', 'translationNotes']
    langCodes.forEach(code => variables.forEach(variable => valueCallbacks.push(data => data[code][variable])))

    await this.updatePositionalTableBase(
      oldData, newData, songId, 'song_names', valueNames, valueCallbacks, 'song_id', 'pos',
      (oldData, newData, i) => {
        if (oldData[i].name_text !== newData[i].name || oldData[i].reference_id !== newData[i].referenceId) return true
        for (let j = 0; j < langCodes.length; j++) {
          const code = langCodes[j]
          const localizationChanges =
              oldData[i][code + '_name'] === newData[i][code].name &&
              oldData[i][code + '_reference_id'] === newData[i][code].referenceId &&
              oldData[i][code + '_translation_notes'] === newData[i][code].translationNotes

          if (!localizationChanges) return true
        }
        return false
      }
    )
  }

  
  /**
   * Get all file rows linked to a song
   * @param {string} songId
   * @returns {Row[]}
   */
  // getFileData = async songId => this.callAsyncResult(
  //   this.all('files', 'song_id = ?', [songId]),
  //   rows => rows.map(row => ({  }))
  // )
  // async getFileData (songId) {
  //   const rows = await this.runSelectMethod(callback => {
  //     this.db.all('SELECT * FROM files WHERE song_id = ?', [songId], callback)
  //   })
  //   console.log(rows)
  //   return rows
  // }

  /**
   * Gets an array with the rows of a positional table ordered for a single song
   * @param {number} songId
   * @param {string} table - Table name
   * @returns {Row[]} Array with all the rows ordered
   */
  allOrderedBySong = async (songId, table) => await this.allOrdered(table, 'song_id = ?', 'pos', [songId])

  /**
   * Get all the authors from a song in an ordered array
   * @param {string} songId
   * @returns {import('../public/scripts/song').SongAuthor[]}
   */

  /**
   * Get all names from a song ordered
   * @param {string} songId
   * @returns {Row[]} All the name rows for a song ordered
   */
  // async getSongNames (songId) {
  //   const names =
  //   return names
  // }

  /**
   * Get all unnoficial names from a song ordered
   * @param {string} songId
   * @returns {Row[]} All the unnoficial rows for a song ordered
   */

  /**
   * Gets the medias object for a song
   * @param {string} songId
   * @returns {import('../public/scripts/editor').Medias}
   */

  /**
   * Gets all the features that are being used inside a medias object
   * @param {import('../public/scripts/editor').Medias} medias
   * @returns {string} List of feature ids
   */

  /**
   * Convert a medias into an object that maps feature id to its media
   * @param {import('../public/scripts/editor').Medias} medias
   * @returns {object}
   */

  /**
   * Shorthand for SELECT * FROM ... WHERE ... LIKE ...
   * @param {string} table - Table name
   * @param {*} column - Column name
   * @param {*} keyword - Keyword for column to be like
   * @returns {Row[]}
   */
  selectLike = async (table, column, keyword) => await this.all(table, `${column} LIKE '%' || ? || '%'`, [keyword])

  /**
   * Gets rows for a table based on filtering names by keyword
   * @param {string} table
   * @param {string} keyword
   * @returns {Row[]}
   */
  getByKeyword = async (table, keyword) => await this.selectLike(table, getNameColumn(table), keyword)

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
  runSelectMethod = async (methodCallback) => await this.runDatabaseMethod(methodCallback)

  async callAsyncResult (asyncMethod, callback) {
    const result = await asyncMethod()
    return callback(result)
  }

  /**
   * Helper function that gets all the name data for a song
   * @param {string} songId
   * @returns {import('../public/scripts/song').Name[]}
   */
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

function removeDuplicates (array) {
  return [...new Set(array)]
}

const db = new WikiDatabase()

module.exports = db
