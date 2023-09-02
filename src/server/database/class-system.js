const { removeBraces, matchGroup, compareObjects, isObject } = require('../misc/server-utils')
const handler = require('./sql-handler')
const def = require('./data-def')
const predef = require('./predefined')
const { getName, deepcopy, keysInclude, removeBrackets } = require('../misc/common-utils')

/**
 * An object that maps database class names to their
 * respective definition object
 * @typedef {object} DefMap
 */

/**
 * Represents CPT code, used to define the properties of the database classes
 * @typedef {string} CPT
 */

/**
 * An object of the row of a database item
 * @typedef {object} ItemRow
 * @property {number} id - Item id
 * @property {string} cls - Item class
 * @property {ItemData} data - Item data
 * @property {string} querywords - A string with all the names of an item separated by `&&`
 */

/**
 * Object for a class item's data
 * @typedef {object} ItemData
 */

/**
 * Object mapping item classes to an array of property paths
 * @typedef {object} PathMap
 */

/** Class for the system that handles everything that relates to item classes */
class ClassSystem {
  /** Initiate the system based on the defined item classes */
  constructor () {
    ['main', 'helper', 'static'].forEach((category, i) => {
      this[this.getDefName(category)] = def[i]
    })

    this.assignDefaults()
    this.queryIndexing()
    this.findIdReferences()

    this.majorClasses = { ...this.mainClasses, ...this.staticClasses }
    this.allClasses = { ...this.majorClasses, ...this.helperClasses }
  }

  /** Columns for main class tables */
  columns = 'data, querywords'

  /** Creates the table for items and adds the static and predefined items */
  async createTables () {
    await handler.create(`
      items (
        id SERIAL PRIMARY KEY,
        cls TEXT,
        data JSONB,
        querywords TEXT,
        predefined INT
      )
    `)

    const rows = await handler.selectAll('items')
    const allClasses = rows.map(row => row.cls)
    // add static classes if they don't exist
    for (const cls in this.staticClasses) {
      if (!allClasses.includes(cls)) {
        await this.insertItem(cls, this.defaults[cls])
      }
    }
    for (let i = 0; i < predef.length; i++) {
      const item = predef[i]
      if ((await handler.selectWithColumn('items', 'predefined', item.id)).length === 0) {
        await this.insertItem(item.cls, item.data, item.id)
      }
    }
  }

  /**
   * Create a new item and insert it into the databae
   * @param {string} cls - Item class
   * @param {ItemData} data - Initial item data
   * @param {number} predefined - Predefined item id
   */
  async insertItem (cls, data, predefined = null) {
    await handler.insert(
      'items', 'cls, data, querywords, predefined',
      [cls, JSON.stringify(data), await this.getQueryWords(cls, data), predefined]
    )
  }

  /**
   * Create and save the default object structure for each item class, where every array is
   * replaced with an empty array, every helper class is expanded with its defined properties,
   * and every base property is kept to their standard value
   */
  assignDefaults () {
    this.defaults = {}

    const createDefault = (cls, code) => {
      const defaultObject = {}
      this.iterateDeclarations(code, (property, type) => {
        if (this.isArrayType(type)) {
          defaultObject[property] = []
        } else if (this.isHelperType(type)) {
          defaultObject[property] = this.getDefault(removeBraces(type))
        } else {
          let value = {
            BOOLEAN: false
          }[removeArgs(type)]

          // default "default" is null
          if (value === undefined) value = null
          defaultObject[property] = value
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
          if (this.isHelperType(type)) helperClasses.push(removeBrackets(removeBraces(type)))
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

    for (const cls in this.allClasses) {
      createDefault(cls, this.allClasses[cls].code)
    }
  }

  /**
   * Iterate through every property declaration in a CPT code snippet and run a function for each declaration
   * @param {string} code - Code snippet
   * @param {function(string, string, string[]) : void} callbackfn - Callback function for each declaration which takes as the first argument the name of the property in the declaration, as the second argument the type declaration and as the third argument the array of the parameters declared
   */
  iterateDeclarations (code, callbackfn) {
    const declarations = splitDeclarations(code)
    declarations.forEach(declr => {
      const property = declr.match(/\w+/)[0]
      const typePattern = /(?:{)?\w+(?:\(.*\))?(?:})?(\[\])*/
      const type = matchGroup(declr, undefined, '(?<=\\w+\\s+)', typePattern.source)[0]

      const rest = declr.replace(new RegExp('\\w+\\s+' + typePattern.source), '')
      let params = []
      if (rest) {
        const quotePattern = /".*"|'.*'/g
        const quoted = rest.match(quotePattern) || []
        params = rest.replace(quotePattern, '').match(/\S+/g) || []
        params = params.concat(quoted)
      }
      callbackfn(property, type, params)
    })
  }

  async isStaticItem (id) {
    return this.isStaticClass(await this.getClass(id))
  }

  /**
   * Check if a value is the name of a static class
   * @param {any} type - Value to check
   * @returns {boolean} True if it is the name of a static class
   */
  isStaticClass = cls => keysInclude(this.staticClasses, cls)

  /**
   * Check if an item is predefined
   * @param {number} id - Item id
   * @returns {boolean} `true` if the item is predefined, `false` otherwise
   */
  async isPredefined (id) {
    return Boolean((await this.getItem(id)).predefined)
  }

  /**
   * Check if a value is the name of a main class
   * @param {any} type - Value to check
   * @returns {boolean} `true` if it is the name of a main class, `false` otherwise
   */
  isMainClass = cls => keysInclude(this.mainClasses, cls)

  /**
   * Check if a CPT type declaration represents a declaration of an array type
   * @param {string} type - Type part of the declaration
   * @returns {boolean} `true` if it represents an array, `false` otherwise
   */
  isArrayType (type) {
    return type.includes('[]')
  }

  /**
   * Check if a CPT type declaration represents a declaration of a helper type
   * @param {string} type - Type declaration
   * @returns {boolean} `true` if it represents a helper type, `false` otherwise
   */
  isHelperType (type) {
    return type.includes('{')
  }

  /**
   * Check if an item data follows the rules defined for it
   * @param {string} cls - Item class of the data
   * @param {ItemData} data - Item data to validate
   * @returns {string[]} Array where each element is a string describing a validation error
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
            if (this.isHelperType(type)) {
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
              } else if (['ID', 'INT', 'FILE'].includes(type)) {
                if (!Number.isInteger(value)) {
                  errorMsg('an integer number')
                }
              } else if (type === 'BOOLEAN') {
                if (typeof value !== 'boolean') {
                  errorMsg('a boolean value')
                }
              } else if (type === 'DATE') {
                let validDate = true
                try {
                  if (!value.match(/\d+-\d{2}-\d{2}/)) {
                    validDate = false
                  }
                } catch {
                  validDate = false
                }
                if (!validDate) errorMsg('a valid date string (YYYY-MM-DD)')
              }
            }
          }
        }

        checkType(data[property], type, path.concat([`.${property}`]))
      })
    }

    const classDefinition = this.isStaticClass(cls)
      ? this.staticClasses[cls]
      : this.mainClasses[cls]

    iterateObject(classDefinition, data, [`[${cls} Object]`])

    return errors
  }

  /**
   * Update an item in the database or add if it doesn't exist
   * @param {ItemRow} row - Row object for the item
   */
  async updateItem (row) {
    const { data, id, cls } = row

    if (id === undefined) this.insertItem(cls, data)
    else {
      await handler.updateOneCondition(
        'items', 'data, querywords', [JSON.stringify(data), this.getQueryWords(cls, data)], 'id', id
      )
    }
  }

  /**
   * Get an item from a main or static class
   * @param {number} id - Item id
   * @returns {Row} Row data for the item
   */
  async getItem (id) {
    return (await handler.selectWithColumn('items', 'id', id))[0]
  }

  /**
   * Get the class an item belongs to
   * @param {number} id - Item id
   * @returns {string} - Class name
   */
  async getClass (id) {
    return (await this.getItem(id)).cls
  }

  /**
   * Get the default `ItemData` object for a given class
   * @param {string} cls - Item class
   * @returns {ItemData} Object representing the default structure
   */
  getDefault = cls => this.defaults[cls]

  /**
   * Find all the paths in every class definition that leads to a type/param following a specific condition
   * @param {PathMap} variable - Object to store the paths
   * @param {function(string, string[]) : boolean} condition - Function that takes as the first argument the type of a property and as the second argument the parameters of a property, and returns a boolean for whether the values meet the criteria
   */
  findPaths (variable, condition) {
    const mainClasses = this.majorClasses
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

  /** Create the object that maps for each class all the paths where other classes reference the class */
  findIdReferences () {
    const classes = this.majorClasses
    this.idPaths = {}
    for (const cls in classes) {
      this.idPaths[cls] = {}
      this.findPaths(this.idPaths[cls], type => {
        return type.match(`^ID\\(${cls}\\)(\\[\\])*$`)
      })
    }
  }

  /**
   * Select all items in a class
   * @param {string} cls - Item class
   * @returns {ItemRow[]} All founds rows
   */
  async selectAllInClass (cls) {
    return handler.selectWithColumn('items', 'cls', cls)
  }

  /**
   * Get the row for a static class
   * @param {string} cls - Static class
   * @returns {ItemRow} Row for the class
   */
  async getStaticClass (cls) {
    return (await this.selectAllInClass(cls))[0]
  }

  /**
   * Check all items that reference a target item within their data
   * @param {number} id - Target item id
   * @returns {string[][]} Array of arrays that contain as the first element the string for the class name and second element the string for the item name
   */
  async checkReferences (id) {
    const cls = await this.getClass(id)
    const clsPaths = this.idPaths[cls]
    const encountered = []
    const majorClasses = this.majorClasses
    for (const cls in clsPaths) {
      const paths = clsPaths[cls]
      const allElements = await this.selectAllInClass(cls)

      paths.forEach(path => {
        allElements.forEach(element => {
          let foundRef = false
          const pathTraveller = (obj, i) => {
            if (i < path.length) {
              const step = path[i]
              i++
              if (step === undefined) return
              if (step === '[]') {
                obj.forEach(next => {
                  pathTraveller(next, i)
                })
              } else {
                pathTraveller(obj[step], i)
              }
            } else {
              if (obj === id) {
                foundRef = true
              }
            }
          }
          pathTraveller(element.data, 0)
          if (foundRef) encountered.push([majorClasses[cls].name, getName(element.querywords)])
        })
      })
    }

    return encountered
  }

  /**
   * Create and save an object that maps each class
   * onto an array representing paths that lead to the search query properties
   *
   * This object is created at the beginning to avoid repeating this operation each search query request
   */
  queryIndexing () {
    const queryIndex = {}
    Object.assign(this, { queryIndex })

    this.findPaths(queryIndex, (type, params) => {
      return params.includes('QUERY')
    })
  }

  /**
   * Get the words that can be used in a search query to identify a class item
   * and return them in the query format stored in the database
   * @param {string} cls - Item class
   * @param {ItemData} data - Item data
   * @returns {string} The useable expresions/words separated by "&&", the format stored in the database
   */
  getQueryWords (cls, data) {
    if (this.isStaticClass(cls)) return null
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
   * Search all items within a row in which the name contains an expression and get a map of ids and the name that matches it
   * @param {ItemRow[]} rows - Array with relevant rows
   * @param {string} keyword - Expression to search in names
   * @returns {object} Map of item ids to names
   */
  getNameWithRows (rows, keyword) {
    const results = {}
    rows.forEach(row => {
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
   * Get all rows that match a search query result in a given class
   * @param {string} cls - Item class to search
   * @param {string} keyword - Expression to match the search result
   * @returns {object} Object that maps ids into names for the rows
   */
  async getByName (cls, keyword) {
    const response = await handler.selectLike('items', 'querywords', keyword, 'cls', cls)
    return this.getNameWithRows(response, keyword)
  }

  /**
   * Get the array dimension for a property type declaration in CPT
   * @param {string} type - Type declaration
   * @returns {number} Array dimension, 0 if not an array
   */
  getDimension (type) {
    const matches = type.match(/\[\]/g)
    if (matches) return matches.length
    else return 0
  }

  /**
   * Get the first name in the query words for a row based on the id of the row and its class
   * @param {string} cls - Class to search
   * @param {number} id - Item id
   * @returns {string} First query word in the row
   */
  getQueryNameById = async (id) => {
    return getName((await this.getItem(id)).querywords) || ''
  }

  /**
   * Get the category of a class
   * @param {string} cls - Name of the class
   * @returns {string} Name of the category
   */
  getClassCategory (cls) {
    if (this.isStaticClass(cls)) return 'static'
    else if (this.isMainClass(cls)) return 'main'
    else return 'helper'
  }

  /**
   * Get the definition object for a class
   * @param {string} cls - Class name
   * @returns {object} Definition object
   */
  getAnyClass (cls) {
    const cat = this.getClassCategory(cls)
    return this.getDefObj(cat)[cls]
  }

  /**
   * Get the name of the definition object for a class category
   * @param {string} cat - Category name
   * @returns {string} Definition object name
   */
  getDefName (cat) {
    return `${cat}Classes`
  }

  /**
   * Get the object with definitions for a class category
   * @param {string} cat - Class category
   * @returns {DefMap} Definition object
   */
  getDefObj (cat) {
    return this[this.getDefName(cat)]
  }

  /**
   * Check if a class is a major class, ie a main class or a static class
   * @param {string} cls - Class name
   * @returns {boolean} `true` if is a major class, `false` if is a helper class
   */
  isMajorClass (cls) {
    return this.isStaticClass(cls) || this.isMainClass(cls)
  }

  /**
   * Check if an item data object is different from the one in the database
   * @param {number} id - Item id
   * @param {ItemData} data - Item data to compare with the database one
   * @returns {boolean} `true` if the data is different and `false` if it is the same
   */
  async didDataChange (id, data) {
    const old = await this.getItem(id)
    if (!old) return true
    else {
      return !compareObjects(old.data, data)
    }
  }
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
 * Remove the argument of a property type declaration
 * @param {string} type - Type declaration
 * @returns {string} Declaration with no arguments
 */
function removeArgs (type) {
  return type.replace(/\(.*\)/, '')
}

module.exports = new ClassSystem(def)
