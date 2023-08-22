const { removeBraces, matchGroup, deepcopy, compareObjects } = require('../misc/server-utils')
const handler = require('./sql-handler')
const def = require('./data-def')
const { getName } = require('../misc/common-utils')

/**
 * An object that maps database class names to their
 * respective definition object
 * @typedef {object} DefMap
 */

/**
 * An array of definitions, where the first element is for main classes,
 * the second is for helper classes and the third is for static classes
 * @typedef {DefMap[]} DataDef
 */

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
 * An array containing values for a row in the following order:
 *
 * * Index 0 is the JSON string of `ItemData`
 * * Index 1 is the string for the query words
 * @typedef {string[]} ItemValues
 */

/**
 * Object mapping classes to an array of property paths
 * @typedef {object} PathMap
 */

/**
 * Class that handles the system that relates to the classes of data
 */
class ClassSystem {
  /**
   * Create the system with a database definition
   * @param {DataDef} def - Data definition
   */
  constructor (def) {
    ['main', 'helper', 'static'].forEach((category, i) => {
      this[this.getDefName(category)] = def[i]
    })

    /** Columns for main class tables */
    this.columns = 'data, querywords'

    this.assignDefaults()
    this.queryIndexing()
    this.findIdReferences()

    // create table for each main class
    for (const cls in this.mainClasses) {
      this.createClass(cls)
    }

    // create static class table
    handler.create(`
      static (
        class TEXT PRIMARY KEY,
        data JSONB
      )`
    ).then(() => {
      for (const cls in this.staticClasses) {
        this.insertStatic(cls, JSON.stringify(this.defaults[cls]))
      }
    })
  }

  /**
   * Create and save the default object structure for each database class, where every array is
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

    const allClasses = this.getAllClasses()

    for (const cls in allClasses) {
      createDefault(cls, allClasses[cls].code)
    }
  }

  // /**
  //  * Insert a static class if it doesn't exist yet
  //  * @param {ClassName} cls - Name of the class
  //  */
  /**
   * Insert a static class if it doesn't exist yet
   * @param {ClassName} cls - Name of the class
   * @param {ItemData} defaultData - Default item data object
   */
  insertStatic = async (cls, defaultData) => {
    await handler.insert('static', 'class, data', [cls, defaultData], 'class')
  }

  /**
   * Create the table for a main class
   * @param {ClassName} cls - Class name
   */
  async createClass (cls) {
    await handler.create(`
    ${cls} (
      id SERIAL PRIMARY KEY,
      data JSONB,
      querywords TEXT
    )
  `)
  }

  /**
   * Iterate through every property declaration in a CPT code snippet and run a function for each declaration
   * @param {CPT} code - Code snippet
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

  /**
   * Get an object with all main, static and helper class definitions
   * @returns {DefMap} Definition map for all classes
   */
  getAllClasses () {
    return Object.assign(this.getMajorClasses(), this.helperClasses)
  }

  /**
   * Get object with all main and static class definitions
   * @returns {DefMap} Definition map for all main and static classes
   */
  getMajorClasses () {
    return Object.assign({}, this.mainClasses, this.staticClasses)
  }

  /**
   * Check if a value is the name of a static class
   * @param {any} type - Value to check
   * @returns {boolean} True if it is the name of a static class
   */
  isStaticClass = cls => keysInclude(this.staticClasses, cls)

  /**
   * Check if a value is the name of a main class
   * @param {any} type - Value to check
   * @returns {boolean} True if it is the name of a main class
   */
  isMainClass = cls => keysInclude(this.mainClasses, cls)

  /**
   * Get the data in the database from a main class item given its id
   * @param {ClassName} cls - Name of the main class
   * @param {number} id - Id of the row to get
   * @returns {Row} Data retrieved from the database
   */
  getMainItem = async (cls, id) => await handler.selectId(cls, id)

  /**
   * Check if a CPT type declaration represents a declaration of an array type
   * @param {string} type - Type part of the declaration
   * @returns {boolean} True if it represents an array
   */
  isArrayType (type) {
    return type.includes('[]')
  }

  /**
   * Check if a CPT type declaration represents a declaration of a helper type
   * @param {string} type - Type declaration
   * @returns {boolean} True if it represents a helper type
   */
  isHelperType (type) {
    return type.includes('{')
  }

  /**
   * Check if the object for a database class follows the rules defined for it
   * @param {ClassName} cls - Class of the data to validate
   * @param {ItemData} data - Data object to validate
   * @returns {string[]} Array where each element is a string describing an error with the data
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
   * @param {ClassName} cls - Class of the item
   * @param {Row} row - Row object for the item
   */
  async updateItem (cls, row) {
    const { data } = row
    if (this.isStaticClass(cls)) {
      await handler.updateOneCondition('static', 'data', [JSON.stringify(data)], 'class', cls)
    } else {
      const { id } = row
      const itemValues = [JSON.stringify(data), this.getQueryWords(cls, data)]
      if (id === undefined) await this.insertData(cls, itemValues)
      else await this.updateData(cls, id, itemValues)
    }
  }

  /**
   * Get an item from a main or static class
   * @param {ClassName} cls - Class of the item
   * @param {number} id - Id of the item if not a static class
   * @returns {Row} Row data for the item
   */
  async getItem (cls, id) {
    return this.isStaticClass(cls)
      ? await this.getStatic(cls)
      : await this.getMainItem(cls, id)
  }

  /**
   * Get the default `ItemData` object for a given class
   * @param {ClassName} cls - Class to target
   * @returns {ItemData} Object representing the default structure
   */
  getDefault = cls => this.defaults[cls]

  /**
   * Get the row for a static class
   * @param {ClassName} cls - Class to get
   * @returns {Row} Fetched row
   */
  getStatic = async cls => (await handler.selectWithColumn('static', 'class', cls))[0]

  /**
   * Update the row for a static class
   * @param {Row} row - Row to use to update
   */
  async updateStatic (cls, row) {
  }

  /**
   * Find all the paths in every class definition
   * that leads to a type/param following a specific condition
   * @param {PathMap} variable - Object to store the paths
   * @param {function(string, string[]) : boolean} condition - Function that takes as the first argument the type of a property and as the second argument the parameters of a property, and returns a boolean for whether the values meet the criteria
   */
  findPaths (variable, condition) {
    const mainClasses = this.getMajorClasses()
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

  findIdReferences () {
    const classes = this.getMajorClasses()
    this.idPaths = {}
    for (const cls in classes) {
      this.idPaths[cls] = {}
      this.findPaths(this.idPaths[cls], type => {
        return type.match(`^ID\\(${cls}\\)(\\[\\])*$`)
      })
    }
  }

  selectAllInClass (cls) {
    if (this.isStaticClass(cls)) {
      return handler.selectWithColumn('static', 'class', cls)
    } else {
      return handler.selectAll(cls)
    }
  }

  async checkReferences (cls, id) {
    const clsPaths = this.idPaths[cls]
    const encountered = []
    const majorClasses = this.getMajorClasses()
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
   * Search a path in an object and check if it matches a value,
   * removing that value if it does and doing nothing otherwise
   *
   * The removal is done by setting the property to null, if it is a property
   * or by splicing the element from the array, if it is the member of an array
   * @param {object} data - The object to search
   * @param {string[]} path - An array of property/indexes representing a path
   * @param {any} value - The value to check at the end of the path
   * @returns {data | null} If a deletion ocurred, returns the new object, otherwise returns null
   */
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

  /**
   * Create and save an object that maps each `ClassName` in the database
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
   * @param {ClassName} cls - Class of the item
   * @param {ItemData} data - Data of the item
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
   * Get all rows that match a searcy query result in a given class
   * @param {ClassName} cls - Class to search in
   * @param {string} keyword - Word to match the search result
   * @returns {object} Object that maps ids into pharses/names for the rows
   */
  async getByName (cls, keyword) {
    const response = await handler.selectLike(cls, 'querywords', [keyword])
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
   * Get the first phrase/word in the query words for a row based on the id of the row and its class
   * @param {ClassName} cls - Class to search
   * @param {number} id - Id of the row to get
   * @returns {string} First query word in the row
   */
  getQueryNameById = async (cls, id) => {
    try {
      return (await handler.selectId(cls, id, 'querywords')).querywords.split('&&')[0]
    } catch (error) {
      return ''
    }
  }

  /**
   * Find all paths that lead to a type `ID(class)` in every class
   * @param {ClassName} cls - Class to find references of
   * @returns {PathMap} Object with the paths
   */
  // findIdPaths (cls) {
  //   const referencers = {}
  //   this.findPaths(referencers, type => {
  //     return type.includes(`ID(${cls})`)
  //   })
  //   return referencers
  // }

  /**
   * Get the category of a class
   * @param {ClassName} cls - Name of the class
   * @returns {string} String with the name of the category
   */
  getClassCategory (cls) {
    if (this.isStaticClass(cls)) return 'static'
    else if (this.isMainClass(cls)) return 'main'
    else return 'helper'
  }

  /**
   * Get the definition object for a class
   * @param {ClassName} cls - Class name
   * @returns {object} Definition object
   */
  getAnyClass (cls) {
    const cat = this.getClassCategory(cls)
    return this.getDefObj(cat)[cls]
  }

  getDefName (cat) {
    return `${cat}Classes`
  }

  getDefObj (cat) {
    return this[this.getDefName(cat)]
  }

  /**
   * Insert a row into a table associated with a main class
   * @param {ClassName} cls - Name of the class
   * @param {ItemValues} values - Values for the type
   */
  insertData = async (cls, values) => {
    await handler.insert(cls, this.columns, values)
  }

  /**
   * Update a row inside a table associated with a main class
   * @param {ClassName} cls - Name of the main class
   * @param {number} id - Id of the row to update
   * @param {ItemValues} values - Values to update
   */
  async updateData (cls, id, values) {
    await handler.updateById(cls, this.columns, values, id)
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
 * Remove all bracket characters from a string
 * @param {string} str - String
 * @returns {string} Modified string
 */
function removeBrackets (str) {
  return str.replace(/\[|\]/g, '')
}

/**
 * Check if a value is a JS object
 * @param {any} value - Value
 * @returns {boolean} True if is a JS object
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
 * Check if a string belongs to the keys of an object
 * @param {object} obj - Object to check
 * @param {string} key - String to find
 * @returns {boolean} True if the keys include the key
 */
function keysInclude (obj, key) { return Object.keys(obj).includes(key) }

module.exports = new ClassSystem(def)
