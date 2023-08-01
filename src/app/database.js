const { Pool } = require('pg')
const jsondiffpatch = require('jsondiffpatch')

const { deepcopy } = require('./utils')

/**
 * Represents CPT code, used to define the properties of the database objects
 * @typedef {string} CPT
 */

/**
 * Represents the data type for a row extracted from one of the tables from the database
 * @typedef {object} Row
 * @property {number} id - Unique id number
 * @property {TypeData} data - Object data
 * @property {string} querywords - String with words to be matched
 */

/**
 * Represent the name of an object defining a table in the database, which has the same name as the type
 * @typedef {string} TypeName
 */

/**
 * An object that follows the rules of a given type as defined
 * by the wiki database code
 * @typedef {object} TypeData
 */

/**
 * Object containing id and data for a row
 * @typedef {object} TypeInfo
 * @property {number | null} id - Id is null if it doesn't exist in the database
 * @property {TypeData} data
 */

/**
 * An array of strings. each representing a step needed to reach a property inside an object
 *
 * The string can be either "[#]" representing it's index "#"" of an array or ".#" representing it's the property "#" of an object
 * @typedef {string[]} PropertyPath
 */

/**
 * An array containing values for a row in the following order:
 *
 * * Index 0 is the JSON string of `TypeData`
 * * Index 1 is the string for the query words
 * @typedef {string[]} TypeValues
 */

/**
 * Class containing the methods to communicate with the database
 * via a defined database structure
 */
class WikiDatabase {
  /**
   * Connects to the database using the type definitions given
   * @param {object} databaseTypes - Object mapping `TypeName` to `ObjectType`, and defines all the database types used
   * @param {object} propertyTypes - Object mapping names to `ObjectType` which are meant to be helper object structures to be used as properties in other objects
   */
  constructor (databaseTypes, propertyTypes, staticTypes) {
    this.handler = new SQLHandler()
    Object.assign(this, { databaseTypes, propertyTypes, staticTypes })

    for (const type in databaseTypes) {
      this.handler.createType(type)
    }

    this.assignDefaults()
    this.queryIndexing()

    // handle static types
    this.handler.create(`
      static (
        id TEXT PRIMARY KEY,
        data JSONB
      )`
    ).then(() => {
      for (const type in staticTypes) {
        this.handler.insertStatic(type, JSON.stringify(this.defaults[type]))
      }
    })

    // create DB for patches
    this.handler.create(`
      changes (
        id SERIAL PRIMARY KEY,
        type TEXT,
        type_id INT,
        patch JSONB
      )
    `)
  }

  /**
   * Check if a string belongs to the keys of an object
   * @param {object} obj - Object to check
   * @param {string} key - String to find
   * @returns {boolean} True if the keys include the key
   */
  keysInclude = (obj, key) => Object.keys(obj).includes(key)

  /**
   * Check if a value is a static type
   * @param {any} type - Value to check
   * @returns {boolean} True if it is a static type
   */
  isStaticType = type => this.keysInclude(this.staticTypes, type)

  /**
   * Check if a value is a database type
   * @param {any} type
   * @returns {boolean} True if it is a database type
   */
  isType = type => this.keysInclude(this.databaseTypes, type)

  /**
   * Get the data from an object type give the id
   * @param {TypeName} type - Name of the type to get
   * @param {number} id - Id of the row to get
   * @returns {Row} Data retrieved from the database
   */
  getDataById = async (type, id) => await this.handler.selectId(type, id)

  /**
   * Check if the object for a type follows the rules defined and returns a list of all the errors found
   * @param {TypeName} type - Type to validate
   * @param {TypeData} data - Object to validate
   * @returns {string[]} Array where each element is a string describing an error
   */
  validate (type, data, isStatic) {
    const errors = []
    const db = this

    // iterate through each property and each validation statement in the object to validate it
    const iterateObject = (code, validators, data, path) => {
      validators.forEach(validator => {
        try {
          if (!validator.f(data)) errors.push(validator.msg)
        } catch (error) {
          errors.push(`Validation exception at ${path.join()}\n${error}`)
        }
      })
      this.iterateDeclarations(code, (property, type) => {
        // check if the type of a property is the same as it was defined
        const checkType = (value, type, path) => {
          if (type.includes('[')) {
            // figure out dimension
            const dimension = db.getDimension(type)
            const realType = type.slice(0, type.length - 2 * dimension)

            // iterate through all the nested arrays to find all destination paths
            const dimensionIterator = (array, level) => {
              if (Array.isArray(array)) {
                for (let i = 0; i < array.length; i++) {
                  const newPath = deepcopy(path)
                  newPath.push(`[${i}]`)
                  if (level === 1) {
                    checkType(array[i], realType, newPath)
                  } else {
                    dimensionIterator(array[i], level - 1)
                  }
                }
              } else {
                errors.push(`${path.join('')} is not an array`)
              }
            }
            dimensionIterator(value, dimension)
          } else {
            const errorMsg = indefiniteDescription => errors.push(`${path.join('')} must be ${indefiniteDescription}`)

            if (db.standardVariables.includes(type)) {
              if (type === 'QUERY') {
                if (typeof value !== 'string' || !value) {
                  errors.push(`Must give a name (error at ${path.join('')})`)
                }
              } else if (value === null) return

              if (type === 'TEXT') {
                if (typeof value !== 'string') {
                  errorMsg('a text string')
                }
              } else if (type === 'INT') {
                if (!Number.isInteger(value)) {
                  errorMsg('an integer number')
                }
              } else if (type === 'BOOLEAN') {
                if (typeof value !== 'boolean') {
                  errorMsg('a boolean value')
                } else if (type === 'DATE') {
                  if (!value.match(/\d+-\d{2}-\d{2}/)) {
                    errorMsg('a valid date string (YYYY-MM-DD)')
                  }
                }
              }
            } else {
              if (!value) errorMsg('a valid object')
              else {
                const propertyType = db.propertyTypes[type]
                iterateObject(propertyType.code, propertyType.validators, value, path)
              }
            }
          }
        }

        checkType(data[property], type, path.concat([`.${property}`]))
      })
    }

    const databaseType = isStatic
      ? db.staticTypes[type]
      : db.databaseTypes[type]

    iterateObject(databaseType.code, databaseType.validators, data, [`[${type} Object]`])

    return errors
  }

  /**
   * Add or update a row in the database for a specific type to match the data given
   * @param {TypeName} type - Name of the type being updated
   * @param {TypeInfo} row - Info for the row
   */
  async updateType (type, row) {
    const { id, data } = row
    const typeValues = [JSON.stringify(data), this.getQueryWords(type, data)]
    if (!id) await this.handler.insertData(type, typeValues)
    else await this.handler.updateData(type, id, typeValues)
  }

  /**
   * Get the default `TypeData` object for a given type
   * @param {TypeName} type - Type to target
   * @returns {TypeData} Object representing default structure
   */
  getDefault = type => this.defaults[type]

  /**
   * Get the row for a static type
   * @param {TypeName} type - Type to get
   * @returns {Row} Fetched row
   */
  getStatic = async type => (await this.handler.select('static', 'id', type))[0]

  /**
   * Update the row for a static type
   * @param {Row} row - Row to update with
   */
  async updateStatic (row) {
    await this.handler.update('static', 'data', 'id', [row.id, JSON.stringify(row.data)])
  }

  /**
   * Create and save the default object structure for each database type, where every array is replaced with an empty array, every object is expanded with its properties, and every other variable is kept null
   */
  assignDefaults () {
    this.defaults = {}
    this.standardVariables = ['TEXT', 'INT', 'BOOLEAN', 'DATE', 'QUERY']
    const mergedTypes = {}
    Object.assign(mergedTypes, this.databaseTypes, this.staticTypes)

    for (const v in mergedTypes) {
      const defaultObject = {}
      const iterate = (object, code) => {
        this.iterateDeclarations(code, (property, type) => {
          if (type.includes('[')) object[property] = []
          else if (this.standardVariables.includes(type)) object[property] = null
          else {
            object[property] = {}
            iterate(object[property], this.propertyTypes[type].code)
          }
        })
      }

      iterate(defaultObject, mergedTypes[v].code)

      this.defaults[v] = defaultObject
    }
  }

  /**
   * Adds a patch to the changes table
   * @param {TypeName} type - Type of the data being changed
   * @param {Row} row - Row for the data being changed
   * @param {boolean} isStatic - True if the type is static
   */
  async addChange (type, row, isStatic) {
    let oldRow
    if (isStatic) {
      oldRow = await this.getStatic(type)
    } else {
      oldRow = await this.handler.selectId(type, row.id)
    }
    if (!oldRow) oldRow = { data: this.defaults[type] }
    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    this.handler.insert(
      'changes',
      'type, type_id, patch',
      [type, isStatic ? 0 : row.id, JSON.stringify(delta)]
    )
  }

  /**
   * Create and save an object that maps each `TypeName` in the database
   * onto an array representing paths that lead to the search query properties
   *
   * This object is used to avoid repeating this operation each search query request
   */
  queryIndexing () {
    const queryIndex = {}
    Object.assign(this, { queryIndex })

    for (const v in this.databaseTypes) {
      queryIndex[v] = []

      const iterate = (code, path) => {
        this.iterateDeclarations(code, (property, type) => {
          const newPath = deepcopy(path).concat([property])
          const dimension = this.getDimension(type)
          for (let i = 0; i < dimension; i++) {
            newPath.push('[]')
          }
          const arrayless = type.replace(/(\[\])*/g, '')
          if (arrayless === 'QUERY') {
            queryIndex[v].push(newPath)
          } else if (!this.standardVariables.includes(arrayless)) {
            iterate(this.propertyTypes[arrayless].code, newPath)
          }
        })
      }
      iterate(this.databaseTypes[v].code, [])
    }
  }

  /**
   * Iterate through every property declared in a CPT code snippet and run a function while iterating
   * @param {CPT} code - Code snippet with declarations
   * @param {function(string, string) : void} callbackfn - Callback function for each iteration which takes as the first argument the name of the property in the declaration and as the second argument the type of the property being declared
   */
  iterateDeclarations (code, callbackfn) {
    const declarations = code.split('\n').map(line => line.trim()).filter(line => line)
    declarations.forEach(declr => {
      const names = declr.match(/\w+(\[\])*/g)
      const property = names[0]
      const type = names[1]
      callbackfn(property, type)
    })
  }

  /**
   * Get the words that can be used in a search query to identify a data type
   * and return them in the query format stored in the database
   * @param {TypeName} type - Type of the data
   * @param {TypeData} data - Object for the data
   * @returns {string} The useable expresions/words separated by "&&", the format stored in the database
   */
  getQueryWords (type, data) {
    const results = []
    const paths = this.queryIndex[type]
    const iterator = (value, path, current) => {
      const type = path[current]
      current++
      if (current === path.length + 1) results.push(value)
      else if (type.includes('[')) {
        value.forEach(element => {
          iterator(element, path, current)
        })
      } else {
        const nextValue = value[type]
        iterator(nextValue, path, current)
      }
    }

    paths.forEach(path => {
      iterator(data, path, 0)
    })

    return results.join('&&')
  }

  /**
   * Get all rows that match a searcy query result in a given type
   * @param {TypeName} type - Type to search in
   * @param {string} keyword - Word to match the search result
   * @returns {object} Object that maps ids into expressions/names for the rows
   */
  async getByName (type, keyword) {
    const response = await this.handler.selectLike(type, 'querywords', [keyword])
    const results = {}
    response.forEach(row => {
      const { id, querywords } = row
      const phrases = querywords.split('&&')
      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i]
        if (phrase.match(new RegExp(keyword, 'i'))) {
          results[id] = phrase
          break
        }
      }
    })
    return results
  }

  /**
   * Get the array dimension for a property type declaration in MWL
   * @param {string} type - Property type declaration
   * @returns {number} Array dimension, 0 if not an array
   */
  getDimension (type) {
    const matches = type.match(/\[\]/g)
    if (matches) return matches.length
    else return 0
  }

  /**
   * Get the first expression/word in the query words for a row based on the id of the row and type
   * @param {TypeName} type - Type to search
   * @param {number} id - Id of the row to get
   * @returns {string} First query word in the row
   */
  getQueryNameById = async (type, id) => {
    try {
      return (await this.handler.selectId(type, id, 'querywords')).querywords.split('&&')[0]
    } catch (error) {
      return ''
    }
  }
}

/**
 * Class that connects to the Postgres database and runs
 * the SQL queries
 */
class SQLHandler {
  constructor () {
    this.pool = new Pool({
      user: 'postgres',
      password: 'password',
      database: 'musicwiki',
      port: '5432'
    })

    this.columns = 'data, querywords'
  }

  create = async query => { await this.pool.query(`CREATE TABLE IF NOT EXISTS ${query}`) }

  createType = async type => {
    await this.create(`
    ${type} (
      id SERIAL PRIMARY KEY,
      data JSONB,
      querywords TEXT
    )
  `)
  }

  /**
   * Select all rows from a table which a column is equal to a value
   * @param {TypeName} type - Type of the data associated with the table
   * @param {string} column - Name of the column to look for
   * @param {string | number} value - Value for the column to match
   * @param {string} selecting - The columns to to include, separated by commas, or leave blank for all columns
   * @returns {Row[]} All the rows from the database
   */
  select = async (type, column, value, selecting = '*') => (await this.pool.query(`SELECT ${selecting} FROM ${type} WHERE ${column} = $1`, [value])).rows

  /**
   * Select the row matchin an id in a table
   * @param {TypeName} type - Type of the data associated with the table
   * @param {number} id - Id of the row
   * @param {string} selecting - Columns to select, separated by commas, or leave blank for all columns
   * @returns {Row}
   */
  selectId = async (type, id, selecting = '*') => (await this.select(type, 'id', id, selecting))[0]

  /**
   * Insert a row into a table
   * @param {TypeName} type - Type of the data associated with the table
   * @param {string} columns - Name of all the columns to insert, comma separated
   * @param {*[]} values - Array with all the values to be inserted in the same order as the columns are written
   */
  insert = async (type, columns, values, condition = '') => (await this.pool.query(
    `INSERT INTO ${type} (${columns}) VALUES (${values.map((v, i) => `$${i + 1}`)}) ${condition}`, values
    ))
  

  /**
   * Insert a static type if it doesn't exist yet
   * @param {TypeName} type - Name of the type
   */
  insertStatic = async (type, defaultData) => {
    await this.insert('static', 'id, data', [type, defaultData], 'ON CONFLICT (id) DO NOTHING')
  }

  /**
   * Insert a row into a table associated with a `TypeData`
   * @param {TypeName} type - Name of the type associated with the table
   * @param {TypeValues} values - Values for the type
   * @returns
   */
  insertData = async (type, values) => (await this.insert(type, this.columns, values, ''))

  /**
   * Update a row inside a table which a column matches a value
   * @param {TypeName} type - Type of the data associated with the table
   * @param {string} setting - Name of all the columns to update, comma separated
   * @param {string} column - Name of the column to match
   * @param {*[]} values - Array where the first element is the value to be matched, and the other values are the ones to update each column in the order the columns are written
   */
  update = async (type, setting, column, values) => {
    await this.pool.query(
    `UPDATE ${type} SET ${setting.split(',').map((setter, i) => `${setter.trim()} = $${i + 2}`).join(', ')} WHERE ${column} = $1`, values
    )
  }

  /**
   * Update a row inside a table associated with a `TypeData`
   * @param {TypeName} type - Type of the data associated with the table
   * @param {number} id - Id of the row to update
   * @param {TypeValues} values - Values to update
   */
  async updateData (type, id, values) {
    await this.update(type, this.columns, 'id', [id].concat(values))
  }

  /**
   * Select all rows in a table where a column matches a certain value
   * @param {TypeName} type - Type of the data associated with the table
   * @param {string} column - Name of the column to match the value
   * @param {string} matching - String to be matched
   * @returns {Row[]}
   */
  selectLike = async (type, column, matching) => (await this.pool.query(`SELECT * FROM ${type} WHERE ${column} LIKE $1`, [`%${matching}%`])).rows
}

/**
 * Class that handles validating data within an object type
 */
class Validator {
  /**
   *
   * @param {function(TypeData) : boolean} f - Takes as argument an object that follows an object type's structure, and returns true if the object is following the rule assigned to this validator, else it returns false, indicating the data is not valid
   * @param {string} msg - Error message to display for the data if it is invalid
   */
  constructor (f, msg) {
    Object.assign(this, { f, msg })
  }
}

/**
 * General class for a database or property type
 */
class ObjectType {
  /**
   * Assigns both values to the object
   * @param {CPT} code - The code snippet which contains the declaration for all properties within this object type
   * @param {Validator[]} validators - A list of all data validators for this object type
   */
  constructor (code, validators = []) {
    Object.assign(this, { code, validators })
  }
}

const db = new WikiDatabase({
  song: new ObjectType(`
    names NAME[]
    authors SONG_AUTHOR[]
    link TEXT
    files SONG_FILE[]
    unofficialNames UNOFFICIAL_NAME[]
    swfMusicNumbers INT[]
    firstParagraph TEXT
    page TEXT
    keySignatures INT[]
    genres INT[]
    categories INT[]
    versions VERSION[]
    composedDate DATE_ESTIMATE
    externalReleaseDate DATE
    priority INT
  `, [
    new Validator(
      o => o.names.length > 0 || o.unofficialNames.length > 0,
      'A song must have at least one name or one unofficial name'
    ),
    new Validator(
      o => o.link === '' || o.link.includes('youtube.com/watch?v=') || o.link.includes('youtu.be/'),
      'A song link must be a valid YouTube link'
    )
  ]),
  author: new ObjectType(`
    name QUERY
  `),
  source: new ObjectType(`
    name QUERY
  `),
  file: new ObjectType(`
    originalname QUERY
    filename TEXT
    source INT
    song INT
    isHQ BOOLEAN
    sourceLink TEXT
  `),
  wiki_reference: new ObjectType(`
    name QUERY
    link TEXT
    description TEXT
  `),
  genre: new ObjectType(`
    name QUERY
    link TEXT
  `),
  instrument: new ObjectType(`
    name QUERY
    link TEXT
  `),
  key_signature: new ObjectType(`
    name QUERY
    link TEXT
  `),
  page: new ObjectType(`
    name QUERY
    content TEXT
    categories INT[]
  `),
  category: new ObjectType(`
    name QUERY
  `),
  flash_room: new ObjectType(`
    name QUERY
    open TIME_RANGE
    songUses SONG_APPEARANCE[]
  `),
  flash_party: new ObjectType(`
    name QUERY
    active TIME_RANGE
    partySongs PARTY_SONG[]
  `),
  music_catalogue: new ObjectType(`
    name QUERY
    description TEXT
    launch DATE_ESTIMATE
    songs CATALOGUE_ITEM[][]
    reference INT
  `),
  stage_play: new ObjectType(`
    name QUERY
    song INT
    appearances STAGE_APPEARANCE[]
  `),
  flash_minigame: new ObjectType(`
    name QUERY
    available TIME_RANGE
    songs GAME_SONG[]
  `),
  flash_misc: new ObjectType(`
    isUnused BOOLEAN
    name QUERY
    description TEXT
    available TIME_RANGE
    song INT
  `),
  penguin_chat_appearance: new ObjectType(`
    name QUERY
    description TEXT
    song INT
    available TIME_RANGE
  `),
  exclusive_app_appearance: new ObjectType(`
    song INT
    name QUERY
    description TEXT
    available TIME_RANGE
  `),
  youtube_video: new ObjectType(`
    name QUERY
    publish_date DATE
    appearances VIDEO_APPEARANCE[]
  `),
  tv_video: new ObjectType(`
    name QUERY
    earliest DATE_ESTIMATE
    appearance VIDEO_APPEARANCE[]
  `),
  industry_release: new ObjectType(`
    release DATE
    songs INT[]
  `),
  screenhog_comission: new ObjectType(`
    comissioner TEXT
    projectName TEXT
    projectDescription TEXT
    songs INT[]
    available DATE_ESTIMATE
  `)
}, {
  NAME: new ObjectType(`
    name QUERY
    reference INT
    pt LOCALIZATION_NAME
    fr LOCALIZATION_NAME
    es LOCALIZATION_NAME
    de LOCALIZATION_NAME
    ru LOCALIZATION_NAME
  `),
  LOCALIZATION_NAME: new ObjectType(`
    name TEXT
    reference INT
    translationNotes TEXT
  `, [
    new Validator(
      o => ((!o.reference && !o.translationNotes) || o.name),
      'Localization name contains reference or translation notes but contains no actual name'
    )
  ]),
  UNOFFICIAL_NAME: new ObjectType(`
    name QUERY
    description TEXT
  `),
  SONG_AUTHOR: new ObjectType(`
    author INT
    reference INT
  `),
  VERSION: new ObjectType(`
    name TEXT
    description TEXT
  `),
  SONG_APPEARANCE: new ObjectType(`
    isUnused BOOLEAN
    available TIME_RANGE
    song INT
    reference INT
  `),
  PARTY_SONG: new ObjectType(`
    isUnused BOOLEAN
    type INT
    usePartyDate BOOLEAN
    available TIME_RANGE
    song INT
  `),
  CATALOGUE_ITEM: new ObjectType(`
    displayName TEXT
    song INT
  `),
  STAGE_APPEARANCE: new ObjectType(`
    isUnused BOOLEAN
    appearance TIME_RANGE
    reference INT
  `),
  GAME_SONG: new ObjectType(`
    isUnused BOOLEAN
    song INT
    useMinigameDates BOOLEAN
    available TIME_RANGE
  `),
  VIDEO_APPEARANCE: new ObjectType(`
    song INT
    isEntireVideo BOOLEAN
    startTime INT
    endTime INT
  `),
  DATE_ESTIMATE: new ObjectType(`
    date DATE
    isEstimate BOOLEAN
  `),
  TIME_RANGE: new ObjectType(`
    start DATE_ESTIMATE
    end DATE_ESTIMATE
  `),
  SONG_FILE: new ObjectType(`
    source INT
    link TEXT
    isHQ BOOLEAN
    originalname TEXT
    filename TEXT
  `)
}, {
  epf_ost: new ObjectType(`
    songs INT[]
  `),
  epfhr_ost: new ObjectType(`
    songs INT[]
  `),
  game_day_ost: new ObjectType(`
    songs INT[]
  `)
})

module.exports = db
