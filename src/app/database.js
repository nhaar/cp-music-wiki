/* eslint no-eval: 0 */

const { Pool } = require('pg')
const pluralize = require('pluralize')

/**
 * Represents MWL code, used for creating the database (read docs for syntax)
 * @typedef {string} WikiDatabaseCode
 */

/**
 * Represents the data type for a row extracted from one of the tables from the database
 * @typedef {object} Row
 * @property {number} id - Unique id number
 * @property {TypeData} data - Object data
 * @property {string} querywords - String with words to be matched
 */

/**
 * Represent the name of an object defining a table in the database
 * @typedef {string} TypeName
 */

/**
 * Represents a type in MWL
 * @typedef {string} MWLType
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
 * Class containing the methods that directly communicate with the Postgres database
 * and to interpret the MWL code
 */
class WikiDatabase {
  /**
   * Connect to the database using the given code
   * @param {WikiDatabaseCode} code - Code to define the database
   */
  constructor (code) {
    this.pool = new Pool({
      user: 'postgres',
      password: 'password',
      database: 'musicwiki',
      port: '5432'
    })

    this.assignDefaults(code)
    this.queryIndexing()
  }

  /**
   * Get the data from an object type give the id
   * @param {TypeName} name - Name of the type to get
   * @param {number} id - Id of the row to get
   * @returns {Row} Data retrieved from the database
   */
  async getDataById (name, id) {
    const result = await this.pool.query(`SELECT * FROM ${pluralize(name)} WHERE id = $1`, [id])
    return result.rows[0]
  }

  /**
   * Check if the object for a type follows the rules defined and returns a list of all the errors found
   * @param {TypeName} type - Type to validate
   * @param {TypeData} data - Object to validate
   * @returns {string[]} Array where each element is a string describing an error
   */
  validate (type, data) {
    const validator = new DataValidator(this)
    return validator.validate(type, data)
  }

  /**
   * Add or update a row in the database for a specific type to match the data given
   * @param {TypeName} name - Name of the type being updated
   * @param {TypeInfo} row - Info for the row
   */
  async updateType (name, row) {
    const id = row.id
    let data = row.data
    const querywords = this.getQueryWords(name, data)
    data = JSON.stringify(row.data)
    const table = pluralize(name)
    if (!id) {
      await this.pool.query(`INSERT INTO ${table} (data, querywords) VALUES ($1, $2)`, [data, querywords])
    } else {
      await this.pool.query(`UPDATE ${table} SET data = $1, querywords = $2 WHERE id = $3`, [data, querywords, id])
    }
  }

  /**
   * Get the default `TypeData` object for a given type
   * @param {TypeName} type - Type to target
   * @returns {TypeData} Object representing default structure
   */
  getDefault (type) {
    return this.defaults[type]
  }

  /**
   * Create the default object for each type and store it in this object
   * based on the MWL code
   * @param {WikiDatabaseCode} code - Code to base defaults from
   */
  assignDefaults (code) {
    this.defaults = {}
    const standardVariables = ['TEXT', 'INT', 'BOOLEAN', 'DATE', 'QUERY']
    this.standardVariables = standardVariables
    const dividedVariables = code.match(/\*\w+(?=:)|\w+(?=:)|\{([^}]+)\}/g)
    const vars = {}
    this.vars = vars
    if (dividedVariables.length % 2 === 1) throw new Error('Invalid variables')
    for (let i = 0; i < dividedVariables.length; i += 2) {
      vars[dividedVariables[i]] = dividedVariables[i + 1]
    }

    for (const v in vars) {
      if (!v.includes('*')) {
        const defaultObject = {}
        const iterate = (object, code) => {
          const definitions = this.getVariableLines(code)
          definitions.forEach(def => {
            const varAndType = def.match(/\w+\[\]|\w+/g)
            const variableName = varAndType[0]
            const type = varAndType[1]
            if (type.includes('[')) object[variableName] = []
            else if (standardVariables.includes(type)) object[variableName] = null
            else {
              object[variableName] = {}
              iterate(object[variableName], vars[`*${type}`])
            }
          })
        }

        iterate(defaultObject, vars[v])

        this.defaults[v] = defaultObject
      }
    }
  }

  /**
   * Create and save an object that maps each `TypeName` in the database
   * onto an array representing paths that lead to the search query properties
   *
   * This object is used to avoid repeating this operation each search query request
   */
  queryIndexing () {
    this.queryIndex = {}

    for (const v in this.vars) {
      if (!v.includes('*')) {
        this.queryIndex[v] = []

        const iterate = (name, path) => {
          const code = this.vars[name]
          const definitions = this.getVariableLines(code)
          definitions.forEach(def => {
            const names = this.getPropertyAndTypeNames(def)
            const property = names[0]
            const type = names[1]

            const newPath = JSON.parse(JSON.stringify(path)).concat([property])
            const dimension = this.getDimension(type)
            for (let i = 0; i < dimension; i++) {
              newPath.push('[]')
            }
            const arrayless = type.replace(/(\[\])*/g, '')
            if (arrayless === 'QUERY') {
              this.queryIndex[v].push(newPath)
            } else if (!this.standardVariables.includes(arrayless)) {
              iterate(`*${arrayless}`, newPath)
            }
          })
        }
        iterate(v, [])
      }
    }
  }

  /**
   * Helper function to get the property and the type name for a given
   * MWL property definition
   * @param {string} definition - MWL code for a property definition
   * @returns {string[]} Two element array, the first being the property and the second the type
   */
  getPropertyAndTypeNames (definition) {
    return definition.match(/\w+\[\]|\w+/g)
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
      if (type.includes('[')) {
        value.forEach(element => {
          if (current === path.length) results.push(element)
          else iterator(element, path, current)
        })
      } else {
        const nextValue = value[type]
        if (current === path.length) results.push(nextValue)
        else iterator(nextValue, path, current)
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
    const response = await this.pool.query(`SELECT id, querywords FROM ${pluralize(type)} WHERE querywords LIKE $1`, [`%${keyword}%`])
    const results = {}
    response.rows.forEach(row => {
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
   * Get all the property declarations for the MWL code for a single
   * data type declaration
   * @param {WikiDatabaseCode} code - Code for a data type declaration
   * @returns {string[]} Array of the property declarations inside the code
   */
  getVariableLines (code) {
    return code.split('\n').filter(line => !line.includes('{') && !line.includes('}') && !line.includes('=>') && !line.includes(':')).map(line => line.trim())
  }

  /**
   * Get the first expression/word in the query words for a row based on the id of the row and type
   * @param {TypeName} type - Type to search
   * @param {number} id - Id of the row to get
   * @returns {string} First query word in the row
   */
  async getQueryNameById (type, id) {
    const response = await this.pool.query(`SELECT querywords FROM ${pluralize(type)} WHERE id = $1`, [id])
    return response.rows[0].querywords.split('&&')[0]
  }
}

/**
 * Class that stores the methods for validating `TypeData` objects and interpret the MWL validation statements
 */
class DataValidator {
  /**
   * Create validator based on a database object
   * @param {WikiDatabase} db - Database the validator will conform to
   */
  constructor (db) {
    this.db = db
  }

  /**
   * Check if the object for a type follows the rules defined and returns a list of all the errors found
   * @param {TypeName} type - Type to validate
   * @param {TypeData} data - Object to validate
   * @returns {string[]} Array where each element is a string describing an error
   */
  validate (type, data) {
    this.errors = []
    this.iterateObject(type, data, [`[${type} Object]`])
    return this.errors
  }

  /**
   * Iterate through an object considering its data and type to validate all properties and validation statements
   * @param {MWLType} type - Type of the object being validated
   * @param {TypeData} data - Object with the data
   * @param {PropertyPath} path - Path to reach this property relative to the non helper type
    */
  iterateObject = (type, data, path) => {
    const code = this.db.vars[type]
    const definitions = code.split('\n').filter(line => !line.includes('{') && !line.includes('}'))
      .map(line => line.trim())
    definitions.forEach((def, i) => {
      if (def.includes('=>')) {
        // am unsure of a simple replacement for this eval
        // without making a more advanced interpreter
        if (!eval(def.replace(/=>/, '').replace(/\$/g, 'data.'))) {
          this.errors.push(definitions[i + 1].replace(/:/, '').trim())
        }
      } else if (!def.includes(':')) {
        const names = def.match(/\w+(\[\])*/g)
        const property = names[0]
        const type = names[1]
        this.checkType(data[property], type, path.concat([`.${property}`]))
      }
    })
  }

  /**
   * Check if a value conforms to the type it is assigned
   * @param {*} value - Value to be checked
   * @param {MWLType} type - Expected type for the value
   * @param {PropertyPath} path - Path reaching the property that gives the value
   */
  checkType = (value, type, path) => {
    if (type.includes('[')) {
      // figure out dimension
      const dimension = this.db.getDimension(type)
      const realType = type.slice(0, type.length - 2 * dimension)
      const dimensionIterator = (array, level) => {
        if (Array.isArray(array)) {
          for (let i = 0; i < array.length; i++) {
            const newPath = JSON.parse(JSON.stringify(path))
            newPath.push(`[${i}]`)
            if (level === 1) {
              this.checkType(array[i], realType, newPath)
            } else {
              dimensionIterator(array[i], level - 1)
            }
          }
        } else {
          this.errors.push(`${path.join('')} is not an array`)
        }
      }
      dimensionIterator(value, dimension)
    } else {
      const errorMsg = indefiniteDescription => this.errors.push(`${path.join('')} must be ${indefiniteDescription}`)

      if (this.db.standardVariables.includes(type)) {
        if (type === 'QUERY') {
          if (typeof value !== 'string' || !value) {
            this.errors.push(`Must give a name (error at ${path.join('')})`)
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
        else this.iterateObject(`*${type}`, value, path)
      }
    }
  }
}

// creating using the code for the music wiki types
const db = new WikiDatabase(
`
song: {
  names NAME[]
  authors SONG_AUTHOR[]
  link TEXT
  files INT[]
  unofficialNames QUERY[]
  => $names.length > 0 || $unofficialNames.length > 0
  : A song must have at least one name or one unofficial name
  => $link === '' || $link.includes('youtube.com/watch&v=') || $link.includes('youtu.be/')
  : A song link must be a valid YouTube link
}

*NAME: {
  name QUERY
  reference INT
  pt LOCALIZATION_NAME
  fr LOCALIZATION_NAME
  es LOCALIZATION_NAME
  de LOCALIZATION_NAME
  ru LOCALIZATION_NAME
}

*LOCALIZATION_NAME: {
  name TEXT
  reference INT
  translationNotes TEXT
  => ($reference || $translationNotes) && $name || (!$reference && !$translationNotes && !$name)
  : Localization name contains reference or translation notes but contains no actual name
}

*SONG_AUTHOR: {
  author INT
  reference INT
}

author: {
  name QUERY
}

source: {
  name QUERY
}

file: {
  originalname QUERY
  filename TEXT
  source INT
  isHQ BOOLEAN
  sourceLink TEXT
}

wiki_reference: {
  name QUERY
  link TEXT
  description TEXT
}
`
)

module.exports = db
