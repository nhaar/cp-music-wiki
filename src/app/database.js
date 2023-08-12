const { Pool } = require('pg')
const jsondiffpatch = require('jsondiffpatch')
const def = require('./data-def')

const { deepcopy, matchGroup, removeBraces, compareObjects, capitalize } = require('./utils')

/**
 * Represents CPT code, used to define the properties of the database classes
 * @typedef {string} CPT
 */

/**
 * An object of the row of a database item
 * @typedef {object} Row
 * @property {number} id - Id in table
 * @property {ItemData} data - Item data
 * @property {string} querywords - String with words to be matched
 */

/**
 * Represents the name of a database class
 * @typedef {string} ClassName
 */

/**
 * An object that contains the data for an item of a class
 * @typedef {object} ItemData
 */

/**
 * An object that maps database class names to their
 * respective definition object
 * @typedef {object} DefMap
 */

/**
 * An array containing values for a row in the following order:
 *
 * * Index 0 is the JSON string of `ItemData`
 * * Index 1 is the string for the query words
 * @typedef {string[]} ItemValues
 */

/**
 * Contains the methods to communicate with the database
 * via a defined database structure
 */
class WikiDatabase {
  /**
   * Connect to the database using the class definitions given
   * @param {DefMap} mainClasses
   * @param {DefMap} helperClasses
   * @param {DefMap} staticClasses
   */
  constructor (mainClasses, helperClasses, staticClasses) {
    this.handler = new SQLHandler()
    Object.assign(this, { mainClasses, helperClasses, staticClasses })

    // create table for each main class
    for (const cls in mainClasses) {
      this.handler.createClass(cls)
    }

    // general class information processing
    this.assignDefaults()
    this.queryIndexing()

    // create static class table
    this.handler.create(`
      static (
        class TEXT PRIMARY KEY,
        data JSONB
      )`
    ).then(() => {
      for (const cls in staticClasses) {
        this.handler.insertStatic(cls, JSON.stringify(this.defaults[cls]))
      }
    })

    // create table for patches
    this.handler.create(`
      revisions (
        id SERIAL PRIMARY KEY,
        class TEXT,
        item_id INT,
        patch JSONB,
        wiki_user INT,
        approver INT,
        timestamp INT,
        minor_edit INT
      )
    `)

    // user table
    this.handler.create(`
      wiki_users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        user_password TEXT,
        display_name TEXT,
        session_token TEXT
      )
    `)

    // save number of classes for preeditor data
    this.classNumber = Object.keys(this.mainClasses).concat(Object.keys(this.staticClasses)).length
  }

  /**
   * Check if a string belongs to the keys of an object
   * @param {object} obj - Object to check
   * @param {string} key - String to find
   * @returns {boolean} True if the keys include the key
   */
  keysInclude = (obj, key) => Object.keys(obj).includes(key)

  /**
   * Check if a value is the name of a static class
   * @param {any} type - Value to check
   * @returns {boolean} True if it is the name of a static class
   */
  isStaticClass = cls => this.keysInclude(this.staticClasses, cls)

  /**
   * Check if a value is the name of a main class
   * @param {any} type - Value to check
   * @returns {boolean} True if it is the name of a main class
   */
  isMainClass = cls => this.keysInclude(this.mainClasses, cls)

  /**
   * Get the data from a main class item given its id
   * @param {ClassName} cls - Name of the main class
   * @param {number} id - Id of the row to get
   * @returns {Row} Data retrieved from the database
   */
  getItemById = async (cls, id) => await this.handler.selectId(cls, id)

  isArrayType (type) {
    return type.includes('[]')
  }

  /**
   * Check if the object for a database class follows the rules defined for it and returns a list of all the errors found
   * @param {ClassName} cls - Class of the data to validate
   * @param {ItemData} data - Data object to validate
   * @returns {string[]} Array where each element is a string describing an error
   */
  validate (cls, data) {
    const errors = []

    // iterate through each property and each validation statement in the definition to validate it
    const iterateObject = (classDef, data, path) => {
      const { code, validators } = classDef
      validators.forEach(validator => {
        try {
          if (!validator.f(data)) errors.push(validator.msg)
        } catch (error) {
          errors.push(`Validation exception at ${path.join()}\n${error}`)
        }
      })
      this.iterateDeclarations(code, (property, type, params) => {
        // check if the type of a property is the same as it was defined
        const checkType = (value, type, path) => {
          if (this.isArrayType(type)) {
            const dimension = this.getDimension(type)
            const realType = removeBrackets(type)

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
            const errorMsg = indefiniteDescription => {
              errors.push(`${path.join('')} must be ${indefiniteDescription}`)
            }
            if (type.includes('{')) {
              if (isObject(value)) {
                const propertyType = this.helperClasses[removeBraces(type)]
                iterateObject(propertyType, value, path)
              } else errorMsg('a valid object')
            } else {
              if (params.includes('QUERY')) {
                if (typeof value !== 'string' || !value) {
                  errors.push(`Must give a name (error at ${path.join('')})`)
                }
              } else if (value === null) return

              type = removeArgs(type)

              if (['TEXTSHORT', 'TEXTLONG'].includes(type)) {
                if (typeof value !== 'string') {
                  errorMsg('a text string')
                }
              } else if (['ID', 'INT'].includes(type)) {
                if (!Number.isInteger(value)) {
                  errorMsg('an integer number')
                }
              } else if (type === 'BOOLEAN') {
                if (typeof value !== 'boolean') {
                  errorMsg('a boolean value')
                }
              } else if (type === 'DATE') {
                if (!value.match(/\d+-\d{2}-\d{2}/)) {
                  errorMsg('a valid date string (YYYY-MM-DD)')
                }
              } else if (type === 'FILE') {
                const { originalname, filename } = value
                if (!isString(originalname) || !isString(filename)) {
                  errorMsg('a valid file object')
                }
              }
            }
          }
        }

        checkType(data[property], type, path.concat([`.${property}`]))
      })
    }

    const classDefinition = db.isStaticClass(cls)
      ? this.staticClasses[cls]
      : this.mainClasses[cls]

    iterateObject(classDefinition, data, [`[${cls} Object]`])

    return errors
  }

  /**
   * Add or update a row in the database for a specific class to match the data given
   * @param {ClassName} cls - Name of the class being updated
   * @param {Row} row - Row data
   */
  async updateItem (cls, row) {
    const { id, data, isNew } = row
    const itemValues = [JSON.stringify(data), this.getQueryWords(cls, data)]
    if (isNew) await this.handler.insertData(cls, itemValues)
    else await this.handler.updateData(cls, id, itemValues)
  }

  /**
   * Get the default `ItemData` object for a given class
   * @param {ClassName} cls - Class to target
   * @returns {ItemData} Object representing the default structure
   */
  getDefault = cls => this.defaults[cls]

  /**
   * Get the row for a static class
   * @param {ClassName} cls - Clas to get
   * @returns {Row} Fetched row
   */
  getStatic = async cls => (await this.handler.select('static', 'class', cls))[0]

  /**
   * Update the row for a static clas
   * @param {Row} row - Row to update with
   */
  async updateStatic (cls, row) {
    await this.handler.update('static', 'data', 'class', [cls, JSON.stringify(row.data)])
  }

  /**
   * Create and save the default object structure for each database class, where every array is
   * replaced with an empty array, every helper class is expanded with its defined properties,
   * and every other property is kept null
   */
  assignDefaults () {
    this.defaults = {}

    const createDefault = (cls, code) => {
      const defaultObject = {}
      this.iterateDeclarations(code, (property, type) => {
        if (this.isArrayType(type)) {
          defaultObject[property] = []
        } else if (type.includes('{')) {
          defaultObject[property] = this.getDefault(removeBraces(type))
        } else {
          defaultObject[property] = null
        }
      })
      this.defaults[cls] = defaultObject
    }

    // iterate each class making sure
    // we're not creating the default data for a class
    // that has a property that is a helper class
    // while the helper class in question isn't done yet
    const classesOnHold = []
    while (true) {
      for (const cls in this.helperClasses) {
        const { code } = this.helperClasses[cls]
        const helperClasses = []
        this.iterateDeclarations(code, (property, type) => {
          if (type.includes('{')) helperClasses.push(removeBraces(type))
        })

        let onHold = false
        if (helperClasses) {
          helperClasses.forEach(cls => {
            if (!this.defaults[cls]) onHold = true
          })
        }
        if (onHold) {
          if (!classesOnHold.includes(cls)) classesOnHold.push(cls)
        } else {
          const index = classesOnHold.findIndex(item => item === cls)
          if (index > -1) classesOnHold.splice(index, 1)
          createDefault(cls, code)
        }
      }

      if (classesOnHold.length === 0) break
    }

    const allClasses = this.getAllClasses()

    for (const cls in allClasses) {
      createDefault(cls, allClasses[cls].code)
    }
  }

  /**
   * Get object with all main, static and helper class definitions
   * @returns {DefMap} Containing all classes
   */
  getAllClasses () {
    return Object.assign(this.getMainClasses(), this.helperClasses)
  }

  /**
   * Get object with all main and static class definitions
   * @returns {DefMap} Containing all main and static classes
   */
  getMainClasses () {
    return Object.assign({}, this.mainClasses, this.staticClasses)
  }

  async deleteItem (cls, id) {
    await this.handler.delete(cls, 'id', id)
    await this.handler.insert(
      'revisions',
      'class, item_id, patch',
      [cls, id, null]
    )
    await this.deleteReferences(cls, id)
  }

  /**
   * Add a patch to the revisions table
   * @param {ClassName} cls - Class of the data being changed
   * @param {Row} row - Row for the data being changed
   * @param {boolean} isStatic - True if the class is static
   */
  async addChange (cls, row) {
    let oldRow
    const isStatic = this.isStaticClass(cls)
    if (isStatic) {
      oldRow = await this.getStatic(cls)
    } else {
      oldRow = await this.handler.selectId(cls, row.id)
    }
    if (!oldRow) {
      if (!isStatic) {
        // to add id to row object if creating new entry
        row.id = (await this.handler.getBiggestSerial(cls))
        // this property is for the updating function only
        row.isNew = true
      }
      oldRow = { data: this.defaults[cls] }
    }
    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    this.handler.insert(
      'revisions',
      'class, item_id, patch',
      [cls, row.id, JSON.stringify(delta)]
    )
  }

  findPaths (variable, condition) {
    const mainClasses = this.getMainClasses()
    for (const cls in mainClasses) {
      variable[cls] = []

      const iterate = (code, path) => {
        this.iterateDeclarations(code, (property, type, params) => {
          const newPath = deepcopy(path).concat([property])
          const dimension = this.getDimension(type)
          for (let i = 0; i < dimension; i++) {
            newPath.push('[]')
          }
          const arrayless = removeBrackets(type)
          if (condition(type, params)) {
            variable[cls].push(newPath)
          } else if (arrayless.includes('{')) {
            const braceless = removeBraces(arrayless)
            iterate(this.helperClasses[braceless].code, newPath)
          }
        })
      }
      iterate(mainClasses[cls].code, [])
    }
  }

  findIdPaths (cls) {
    const referencers = {}
    this.findPaths(referencers, type => {
      return type.includes(`ID(${cls})`)
    })
    return referencers
  }

  removeFromPath (data, path, value) {
    const original = deepcopy(data)
    const iterate = (obj, i) => {
      const step = path[i]
      i++
      if (i < path.length) {
        if (step === '[]') {
          obj.forEach(element => {
            iterate(element, i)
          })
        } else {
          iterate(obj[step], i)
        }
      } else {
        if (step === '[]') {
          obj.forEach((element, j) => {
            if (element === value) {
              obj.splice(j, 1)
            }
          })
        } else {
          if (obj[step] === value) {
            obj[step] = null
          }
        }
      }
    }

    iterate(data, 0)
    if (!compareObjects(data, original)) {
      return data
    } else {
      return null
    }
  }

  async deleteReferences (cls, id) {
    const map = this.findIdPaths(cls)
    for (const cls in map) {
      const paths = map[cls]
      let items
      if (this.isStaticClass(cls)) {
        items = [await this.getStatic(cls)]
      } else {
        items = await this.handler.selectAll(cls)
      }
      for (let j = 0; j < items.length; j++) {
        const item = items[j]
        const { data } = item

        for (let i = 0; i < paths.length; i++) {
          const removed = this.removeFromPath(data, paths[i], id)
          if (removed) {
            await this.update(cls, item)
          }
        }
      }
    }
  }

  async update (cls, row) {
    await db.addChange(cls, row)
    if (this.isStaticClass(cls)) {
      await db.updateStatic(cls, row)
    } else {
      await db.updateItem(cls, row)
    }
  }

  /**
   * Create and save an object that maps each `ClassName` in the database
   * onto an array representing paths that lead to the search query properties
   *
   * This object is used to avoid repeating this operation each search query request
   */
  queryIndexing () {
    const queryIndex = {}
    Object.assign(this, { queryIndex })

    this.findPaths(queryIndex, (type, params) => {
      return params.includes('QUERY')
    })
  }

  /**
   * Iterate through every property declaration in a CPT code snippet and run a function while iterating
   * @param {CPT} code - Code snippet with declarations
   * @param {function(string, string) : void} callbackfn - Callback function for each iteration which takes as the first argument the name of the property in the declaration, as the second argument the type of the property being declared and as the third argument the array of the other parameters used in the declaration
   */
  iterateDeclarations (code, callbackfn) {
    const declarations = splitDeclarations(code)
    declarations.forEach(declr => {
      const property = declr.match(/\w+/)[0]
      const typePattern = /(?:{)?\w+(?:\(.*\))?(?:})?(\[\])*/
      const type = matchGroup(declr, undefined, '(?<=\\w+\\s+)', typePattern)[0]
      const rest = declr.match(`(?<=\\w+\\s+${typePattern.source}\\s+).*`)
      let params = []
      if (rest) {
        const quotePattern = /".*"|'.*'/g
        const restString = rest[0]
        const quoted = restString.match(quotePattern) || []
        params = restString.replace(quotePattern, '').match(/\S+/g) || []
        params = params.concat(quoted)
      }
      callbackfn(property, type, params)
    })
  }

  /**
   * Get the words that can be used in a search query to identify a class item
   * and return them in the query format stored in the database
   * @param {ClassName} cls - Type of the data
   * @param {ItemData} data - Object for the data
   * @returns {string} The useable expresions/words separated by "&&", the format stored in the database
   */
  getQueryWords (cls, data) {
    const results = []
    const paths = this.queryIndex[cls]
    const iterator = (value, path, current) => {
      const type = path[current]
      current++
      if (current === path.length + 1) results.push(value)
      else if (this.isArrayType(type)) {
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
   * Get all rows that match a searcy query result in a given class
   * @param {ClassName} cls - Class to search in
   * @param {string} keyword - Word to match the search result
   * @returns {object} Object that maps ids into expressions/names for the rows
   */
  async getByName (cls, keyword) {
    const response = await this.handler.selectLike(cls, 'querywords', [keyword])
    console.log(response)
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
   * Get the array dimension for a property type declaration in CPT
   * @param {string} type - Type in the declaration
   * @returns {number} Array dimension, 0 if not an array
   */
  getDimension (type) {
    const matches = type.match(/\[\]/g)
    if (matches) return matches.length
    else return 0
  }

  /**
   * Get the first expression/word in the query words for a row based on the id of the row and class
   * @param {ClassName} cls - Class to search
   * @param {number} id - Id of the row to get
   * @returns {string} First query word in the row
   */
  getQueryNameById = async (cls, id) => {
    try {
      return (await this.handler.selectId(cls, id, 'querywords')).querywords.split('&&')[0]
    } catch (error) {
      return ''
    }
  }

  /**
   * Get the data used by the pre-editor frontend page
   * @returns {object[]} Each object contains the class name, the pretty name and a boolean for being static, and the array contains every main and static class info
   */
  getPreeditorData () {
    const data = []
    const base = (classDefs, isStatic) => {
      for (const cls in classDefs) {
        data.push({ cls, name: classDefs[cls].name, isStatic })
      }
    }

    [
      ['main', false],
      ['static', true]
    ].forEach(element => {
      base(this[`${element[0]}Classes`], element[1])
    })

    return data
  }

  createEditorModels () {
    const base = (code, obj) => {
      this.iterateDeclarations(code, (property, type, params) => {
        // create automatic generated header
        let header = camelToPhrase(property)
        let description = ''
        const applySandwich = (param, char, callback) => {
          if (param.includes(char)) {
            callback(param.match(`(?<=${char}).*(?=${char})`)[0])
          }
        }
        params.forEach(param => {
          applySandwich(param, '"', res => { header = res })
          applySandwich(param, "'", res => { description = res })
        })

        let args = matchInside(type, '\\(', '\\)')

        if (args) {
          args = args[0].split(',')
          if (args.length === 1) args = args[0]
          type = type.replace(/\(.*\)/, '')
        }

        let value
        if (type.includes('{')) {
          value = base(
            this.helperClasses[type.match('(?<={).*(?=})')[0]].code,
            {}
          )
        } else {
          value = type.match(/\w+/)[0]
        }
        if (this.isArrayType(type)) {
          const dim = this.getDimension(type)
          value = [value, dim]
        }
        obj[property] = [value, header, description, args]
      })

      return obj
    }

    const mainClasses = this.getMainClasses()
    this.modelObjects = {}
    for (const cls in mainClasses) {
      const modelObj = {}
      const code = mainClasses[cls].code

      base(code, modelObj)
      this.modelObjects[cls] = modelObj
    }
  }

  /**
   * Get the data for the editor frontend page
   * @param {number} t - Parameter given by the editor page
   * @returns {object} Object similar to `DefMap`, but containing only the code of the helper, and two extra properties, `cls` for the editing class name and `isStatic` if it is static
   */
  getEditorData (t) {
    const { cls } = this.getPreeditorData()[t]

    return { main: this.modelObjects[cls], cls, isStatic: this.isStaticClass(cls) }
  }

  getClassCategory (cls) {
    if (this.isStaticClass(cls)) return 'static'
    else if (this.isMainClass(cls)) return 'main'
    else return 'helper'
  }

  getAnyClass (cls) {
    const cat = this.getClassCategory(cls)
    return this[`${cat}Classes`][cls]
  }

  async isAdmin (session) {
    // currently every user is admin so just check for existence of account
    const account = (await this.handler.select('wiki_users', 'session_token', session))[0]
    return Boolean(account)
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

    /** Columns for main class tables */
    this.columns = 'data, querywords'
  }

  /**
   * Create a table if it doesn't exist
   * @param {string} query - SQL code that looks like `table (...)` used to create a table
   */
  async create (query) { await this.pool.query(`CREATE TABLE IF NOT EXISTS ${query}`) }

  /**
   * Create the table for a main class
   * @param {ClassName} cls - Main class name
   */
  async createClass (cls) {
    await this.create(`
    ${cls} (
      id SERIAL PRIMARY KEY,
      data JSONB,
      querywords TEXT
    )
  `)
  }

  /**
   * Select all rows from a table which a column is equal to a value
   * @param {string} table - Name of the table
   * @param {string} column - Name of the column to look for
   * @param {string | number} value - Value for the column to match
   * @param {string} selecting - The columns to include, separated by commas, or leave blank for all columns
   * @returns {object[]} All the rows that match
   */
  async select (table, column, value, selecting = '*') {
    return (await this.pool.query(`SELECT ${selecting} FROM ${table} WHERE ${column} = $1`, [value])).rows
  }

  /**
   * Select all the revisions in chronological order tied to a class item and get one of its columns
   * @param {ClassName} cls - Name of the class of the item
   * @param {number} id - Id of item or 0 for static classes
   * @param {string} column - Name of the column to get
   * @returns {string[] | number[]} Array with all the column values
   */
  async selectRevisions (cls, id, column) {
    return ((await this.pool.query(`SELECT ${column} FROM revisions WHERE class = $1 AND item_id = $2 ORDER BY id ASC`, [cls, id])).rows)
      .map(change => change[column])
  }

  /**
   * Get all patches for a class item
   * @param {ClassName} cls - Name of the class
   * @param {number} id - Id of item or 0 for static classes
   * @returns {jsondiffpatch.DiffPatcher[]} Array with all the patches
   */
  async selectPatches (cls, id) {
    return await this.selectRevisions(cls, id, 'patch')
  }

  /**
   * Get all the patch ids for a class item
   * @param {ClassName} cls - Name of the class
   * @param {number} id - Id of item or 0 for static classes
   * @returns {number[]} Array with all the ids
   */
  async selectPatchIds (cls, id) {
    return await this.selectRevisions(cls, id, 'id')
  }

  /**
   * Select every row in a table
   * @param {string} table - Name of the table
   * @returns {object[]} All rows in the table
   */
  async selectAll (table) {
    return (await this.pool.query(`SELECT * FROM ${table}`)).rows
  }

  /**
   * Select the row matching an id in a table
   * @param {string} table - Name of the table
   * @param {number} id - Id of the row
   * @param {string} selecting - Columns to select, separated by commas, or leave blank for all columns
   * @returns {object} Row data matched
   */
  async selectId (table, id, selecting = '*') {
    return (await this.select(table, 'id', id, selecting))[0]
  }

  /**
   * Insert a row into a table
   * @param {string} table - Name of the table
   * @param {string} columns - Name of all the columns to insert, comma separated
   * @param {*[]} values - Array with all the values to be inserted in the same order as the columns are written
   */
  async insert (table, columns, values, condition = '') {
    return await this.pool.query(
      `INSERT INTO ${table} (${columns}) VALUES (${values.map((v, i) => `$${i + 1}`)}) ${condition}`, values
    )
  }

  /**
   * Insert a static class if it doesn't exist yet
   * @param {ClassName} cls - Name of the class
   */
  insertStatic = async (cls, defaultData) => {
    await this.insert('static', 'class, data', [cls, defaultData], 'ON CONFLICT (class) DO NOTHING')
  }

  /**
   * Insert a row into a table associated with a main class
   * @param {ClassName} cls - Name of the class
   * @param {ItemValues} values - Values for the type
   * @returns
   */
  insertData = async (cls, values) => {
    await this.insert(cls, this.columns, values, '')
  }

  /**
   * Update a row inside a table which a column matches a value
   * @param {string} table - Name of the table
   * @param {string} setting - Name of all the columns to update, comma separated
   * @param {string} column - Name of the column to match
   * @param {*[]} values - Array where the first element is the value to be matched, and the other values are the ones to update each column in the order the columns are written
   */
  update = async (table, setting, column, values) => {
    await this.pool.query(
    `UPDATE ${table} SET ${setting.split(',').map((setter, i) => `${setter.trim()} = $${i + 2}`).join(', ')} WHERE ${column} = $1`, values
    )
  }

  /**
   * Update a row inside a table associated with a main class
   * @param {ClassName} cls - Name of the main class
   * @param {number} id - Id of the row to update
   * @param {ItemValues} values - Values to update
   */
  async updateData (cls, id, values) {
    await this.update(cls, this.columns, 'id', [id].concat(values))
  }

  /**
   * Select all rows in a table where a column matches a certain value
   * @param {string} table - Name of the table
   * @param {string} column - Name of the column to match the value
   * @param {string} matching - String to be matched
   * @returns {Row[]}
   */
  selectLike = async (table, column, matching) => {
    return (await this.pool.query(`SELECT * FROM ${table} WHERE ${column} ILIKE $1`, [`%${matching}%`])).rows
  }

  /**
   * Get the biggest ID used in a table
   * @param {string} table - Name of the table
   * @returns {number} The biggest ID
   */
  async getBiggestSerial (table) {
    return Number((await this.pool.query(`SELECT last_value FROM ${table}_id_seq`)).rows[0].last_value)
  }

  async delete (table, column, value) {
    await this.pool.query(`DELETE FROM ${table} WHERE ${column} = $1`, [value])
  }
}

/**
 * Remove all bracket characters from a string
 * @param {string} str
 * @returns {string}
 */
function removeBrackets (str) {
  return str.replace(/\[|\]/g, '')
}

/**
 * Check if a value is a JS object
 * @param {any} value
 * @returns {boolean}
 */
function isObject (value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Remove the argument of a property type declaration
 * @param {string} type - Type declaration
 * @returns {string} Declaration with no arguments
 */
function removeArgs (type) {
  return type.replace(/\(.*\)/, '')
}

/**
 * Check if value is a string
 * @param {any} value
 * @returns {boolean}
 */
function isString (value) {
  return typeof value === 'string'
}

/**
 * Split all declarations in a CPT code snippet
 * @param {CPT} code - CPT code
 * @returns {string[]} Array with declarations
 */
function splitDeclarations (code) {
  const trimAll = array => array.map(str => str.trim()).filter(str => str)
  const allDeclrs = trimAll(code.split(';'))
  const cleanedDeclrs = []
  allDeclrs.forEach(declr => {
    const cleaned = trimAll(declr.split('\n')).join(' ')
    cleanedDeclrs.push(cleaned)
  })
  return cleanedDeclrs
}

/**
 * Match for a pattern than enclosures everything inside two characters
 * @param {string} str - String to match
 * @param {string} lChar - Left character of the enclosure
 * @param {string} rChar - Right character of the enclosure (leave blank for same as left)
 * @returns {object | null} Match result
 */
function matchInside (str, lChar, rChar) {
  if (!rChar) rChar = lChar
  return str.match(`(?<=${lChar}).*(?=${rChar})`)
}

function camelToPhrase (str) {
  const firstWord = str.match(/[a-z]+((?=[A-Z])|$)/)[0]
  const otherWords = str.match(/[A-Z][a-z]*/g)
  return [capitalize(firstWord)].concat(otherWords).join(' ')
}

const db = new WikiDatabase(...def)

db.createEditorModels()

module.exports = db
