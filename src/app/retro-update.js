/*
this file is not accessed by any other file, it is meant to be run standalone
every time a change to the database must be made, this must be accessed first
*/
const db = require('./database')
const jsondiffpatch = require('jsondiffpatch')
const { deepcopy } = require('./utils')

// list of options:
// * create a new path in a data variable (across all entries in a table)
// * remove a path in a data variable (across all entries in a table)
// * transfer (from one path to another, path includes the table as well) (across all entries in a table)

/**
 * An array which represents all versions of a specific type data throught time,
 * with the first element (0th) represents the default type
 * and the last one represents the current versions
 *
 * Since it is linked to the history, by definition its length should be equal
 * to the number of patches for the row + 1 to account for the default version
 * @typedef {TypeData[]} VersionList
 */

/**
 * Represents code for the query language used by the interpreter
 * @typedef {string} RUL
 */

/**
 * Get all the versions of a row throughout all patches applied to it
 * @param {import('./database').TypeName} type - Name for the type
 * @param {number} id - Id of the row
 * @param {import('./database').TypeData} defaultData - Default object to be used as the "0th" version
 * @returns {VersionList} Fetched version list
 */
async function getAllVersions (type, id, defaultData) {
  // const isStatic = type === 'static'
  // if (isStatic) type = id
  // const table = isStatic ? 'static' : type

  const versions = [defaultData]
  const patches = await db.handler.selectPatches(type, id)
  patches.forEach((patch, i) => {
    const nextVersion = jsondiffpatch.patch(deepcopy(versions[i]), patch)
    versions.push(nextVersion)
  })

  return versions
}

/**
 * Takes a list of versions for a data row and converts into patches,
 * saving them in the database
 *
 * The version list length must be compatible with the existing patches in the database,
 * as it only overrides the existing patches as opposed to creating new ones
 * @param {import('./database').TypeName} type - Type to target
 * @param {number} id - Id of the row
 * @param {VersionList} versions - All the versions to save
 */
async function overridePatches (type, id, versions) {
  const patchIds = await db.handler.selectPatchIds(type, id)
  if (versions.length - 1 !== patchIds.length) throw new Error('Versions given cannot describe the patches to override')
  patchIds.forEach((id, i) => {
    const patch = JSON.stringify(jsondiffpatch.diff(versions[i], versions[i + 1]))
    // db.handler.update('changes', 'patch', 'id', [id, patch])
  })
}

class DatabaseManipulator {
  /**
   * Evaluates RUL and updates the database accordingly
   * @param {RUL} code
   */
  async eval (code) {
    const matches = this.collectCommands(code)

    // map for datatype -> associated statements
    const datatypeMap = {}
    const originalDefaults = {}

    const mergedTypes = this.getMergedTypes()
    for (const type in mergedTypes) {
      originalDefaults[type] = deepcopy(db.defaults[type])
    }

    // add all tables
    matches.add.forEach(statement => this.evaluateAdd(statement))

    const tableIn = /(?<=IN\s+)\w+/
    const propertyPattern = method => new RegExp(`(?<=${method}\\s+)\\w+`)
    const typePattern = method => new RegExp(`(?<=${method}\\s+\\w+\\s+)\\w+(\\[\\])*`)

    const base = (method, callback) => statement => {
      const datatype = statement.match(tableIn)[0]
      let property
      let type
      if (method) {
        property = statement.match(propertyPattern(method))[0]
        const typeMatch = statement.match(typePattern(method))
        // in particular, DROP does not have types
        if (typeMatch) type = [0]
      }
      if (callback) callback(datatype, property, type)
      if (!datatypeMap[datatype]) datatypeMap[datatype] = []
      datatypeMap[datatype].push(statement)
    }

    matches.drop.forEach(base('DROP', (datatype, property) => {
      this.dropInObject(db.defaults[datatype], property)
    })
    )
    matches.set.forEach(base('SET', (datatype, property, type) => {
      this.setInObject(db.defaults[datatype], property, type)
      db.databaseTypes[datatype].code += `\n${property} ${type}`
    })
    )
    matches.map.forEach(base()
    )

    for (const type in datatypeMap) {
      const statements = datatypeMap[type]
      this.updatePatches(type, originalDefaults[type], version => {
        const original = deepcopy(version)
        statements.forEach(statement => {
          if (statement.includes('DROP')) {
            const property = statement.match(propertyPattern('DROP'))[0]
            this.dropInObject(version, property)
          } else if (statement.includes('SET')) {
            const property = statement.match(propertyPattern('SET'))[0]
            const type = statement.match(typePattern('SET'))[0]
            this.setInObject(version, property, type)
          } else {
            const pathPattern = this.patterns.path
            const path1 = this.matchGroup(statement, undefined, pathPattern, /(?=\s+->)/)[0]
            const path2 = this.matchGroup(statement, undefined, /(?<=->\s+)/, pathPattern)[0]
            this.mapInObject(original, version, path1, path2, type)
          }
        })
        return version
      })
    }
  }

  groupPatterns (...patterns) {
    const sources = (patterns.map(pattern => pattern.source))
    const combined = sources.reduce((accumulator, cur) => {
      return accumulator + cur
    }, '')
    return new RegExp(combined)
  }

  matchGroup (str, flags, ...patterns) {
    return str.match(new RegExp(this.groupPatterns(...patterns), flags))
  }

  patterns = {
    table: /(?:static\s+|property\s+)?\w+/,
    inDeclr: /IN\s+/,
    type: /\w+(\[\])*/,
    word: word => new RegExp(`\\s+${word}\\s+`),
    path: /(\.\w+|\[[^\]]*\])*/
  }

  /**
   * Organize all the statement types used in the provided code
   * @param {RUL} code
   * @returns {object} Object with the keys `add`, `drop`, `set`, `map`, `transfer`, each containing a list of statements
   */
  collectCommands (code) {
    const { inDeclr, table, type, word, path } = this.patterns

    const matchfn = (...expressions) => {
      return this.matchGroup(code, 'g', ...expressions)
    }
    const inPatterns = (...expressions) => {
      return [inDeclr, table, ...expressions]
    }

    const inWord = (w, ...expressions) => {
      return inPatterns(word(w), ...expressions)
    }

    const matches = {
      add: [/ADD\s+/, table],
      drop: inPatterns(/\s+DROP\s+\w+/),
      set: inWord('SET', /\w+\s+/, type),
      map: inWord('MAP', path, /\s+->\s+/, path),
      transfer: [/TRANSFER\s+/, table, /\s+\[(\*|\d+(?:\s*(,|...)\s*\d+)*)\]\s+/, table, /\s+\w+/]
    }

    // prevent error in non matching cases
    for (const key in matches) {
      matches[key] = matchfn(...matches[key]) || []
    }

    return matches
  }

  /**
   * Evaluate an ADD statement, creating new tables/adding to static table
   * @param {RUL} code - Valid add statement
   */
  evaluateAdd (code) {
    const words = code.match(/\w+/g)
    if (words.length === 2) {
      const type = words[1]
      db.handler.createType(type)
    } else {
      const type = words[2]
      if (words[1] === 'static') {
        db.handler.insertStatic(type, {})
      }
    }
  }

  /**
   * Apply the set method in a JS object
   * @param {object} object - Target
   * @param {string} property - First argument of method
   * @param {string} type - Second argumment of method
   */
  setInObject (object, property, type) {
    if (type.includes('[')) {
      object[property] = []
    } else if (db.standardVariables.includes(type)) {
      object[property] = null
    } else {
      object[property] = db.defaults[type]
    }
  }

  /**
   * Apply the drop method in a JS object
   * @param {object} object - Target
   * @param {string} property - Argument of method
   */
  dropInObject (object, property) {
    delete object[property]
  }

  /**
   * Apply the map method in JS objects
   * @param {object} object1 - Target to map from
   * @param {object} object2 - Target to map to
   * @param {string} path1 - Path in original object
   * @param {string} path2 - Path in new object
   * @param {string} type - Type of the object being handled
   */
  mapInObject (object1, object2, path1, path2, type) {
    const paths = [path1, path2]
    const steps = paths.map(path => path.match(/(?<=\.)\w+|(?<=\[).(?=\])/g))
    const tpath = this.getTypePath(type, steps[1].slice(0, steps.length - 1))

    /**
     * This function will recursively go through each step and determine the values
     * that are to be read, possibly being a single value
     * or an array of values, possibly having more than one dimension
     *
     * @param {object | any} reading - Each step of the iteration, this variable will either be an object, in which case it will be read based on a property, or it will be an array, where it might get read for a specific value or expanded and read on every single value inside of it, and then it will become an array of the previously mentioned types, where each member of the array will get iterated until reaching the end of its path
     * @param {number} i - Loop variable
     * @returns {any | any[]} The final reading value or the array of all reading values
     */
    const readIterator = (reading, i = 0) => {
      if (i < steps[0].length) {
        const step = steps[0][i]
        if (step === '*') {
          // step that represents iterating every member of the array
          // create an array and iterate every member of the array in the current step
          // and then apply itself on each element
          // the result is then adding all the individual results in a larger array and return
          const children = []
          reading.forEach(next => {
            children.push(readIterator(next, i + 1))
          })
          return children
        } else {
          // normal step, just access property and return
          if (!reading) return null
          const next = reading[step]

          return readIterator(next, i + 1)
        }
      } else {
        // finished path, return result
        return reading
      }
    }

    // read the values from the origin object
    const reading = readIterator(object1)

    /**
     * Function to assign the read values
     *
     * It recursively travels the path indicated, branching out if an array
     * with the * mark is reached
     * @param {object | any[] } assigning - A reference to the object which we want to read one step deeper into the path each iteration
     * @param {any[] | any} currentReading - This represents the values that will be assigned, everytime a [*] is reached, the function splits into branch for each element in this, ultimately in the end reaching the root elements of this array
     * @param {number} i - Loop variable
     */
    const assignIterator = (assigning, currentReading, i = 0) => {
      const step = steps[1][i]
      const curType = tpath[i]

      // the last step we will assign, while in these others
      // we will just access the references
      if (i < steps[1].length - 1) {
        // if reached a start, assume that currentReading is an array
        // and iterate through all of them
        if (step === '*') {
          currentReading.forEach(nextReading => {
            let next
            // since object2 is a standard one,
            // need to add the value to the array
            if (curType === '[]') next = []
            else next = deepcopy(db.defaults[curType])
            assigning.push(next)
            assignIterator(next, nextReading, i + 1)
          })
        } else {
          // no iteration needed, simply go forward
          const next = assigning[step]
          if (!next) {
            // in case next step doesn't exist
            if (curType === '[]') assigning[step] = []
            else assigning[step] = deepcopy(db.defaults[curType])
          }

          assignIterator(assigning[step], currentReading, i + 1)
        }
      } else {
        // last step, either we just assign it to the last entry point
        // or if the last step is a start, we iterate and assign to
        // each member of the array
        if (step === '*') {
          currentReading.forEach((nextReading) => {
            assigning.push(nextReading)
          })
        } else {
          assigning[step] = currentReading
        }
      }
    }

    // mutate object2 with the values required
    assignIterator(object2, reading)
  }

  getMergedTypes () {
    return Object.assign({}, db.databaseTypes, db.staticTypes, db.propertyTypes)
  }

  /**
   * Gets the property types in a path
   * @param {import('./database').TypeName} type - Type of the object the path relates to
   * @param {string[]} steps - An array with the steps in the path, ie either digit or * for arrays or a property name
   * @returns {string[]} - List of the types
   */
  getTypePath (type, steps) {
    const tpath = []
    // unify the types that `type` might relate to
    // property types are added because the `type` variable
    // will be mutated onto the children types
    const mergedTypes = this.getMergedTypes()
    steps.forEach(step => {
      // ignore if it is a number or it's just the *
      // because that represents an array element ie there is no type of interest
      if (isNaN(step) && step !== '*') {
        const code = mergedTypes[type].code

        // type is found through the CPT for the property
        const typeMatch = code.match(new RegExp(`(?<=${step}\\s+)\\w+(\\[\\])*`))[0]

        // remove any possible brackets by matching whole word
        type = typeMatch.match(/\w+/)[0]
        let dim = 0
        if (typeMatch.includes('[')) dim = type.match(/\[\]/g).length
        // add [] equal to the number of the dimension
        // because that means the next `dim` elements
        // are just array entries
        // the type itself is acessed at the end of the array
        for (let i = 0; i < dim; i++) {
          tpath.push('[]')
        }
        tpath.push(type)
      }
    })

    return tpath
  }

  /**
   * Updates all the patches for all rows under a type
   * @param {import('./database').TypeName} type - Type to change
   * @param {import('./database').TypeData} defaultData - Default object for the type
   * @param {function(TypeData) : TypeData} callback - Function that takes as the argument a given version of an object and gives back a modifiedone. All the patches will then be based on the newly created versions and replace the previous ones
   */
  async updatePatches (type, defaultData, callback) {
    // find biggest ID to iterate through everything
    const seq = await db.handler.getBiggestSerial(type)
    // iterate every ID, presuming no deletion
    for (let i = 1; i <= seq; i++) {
      const versions = await getAllVersions(type, i, defaultData)
      versions.forEach(version => callback(version))
      overridePatches(type, i, versions)
    }
  }
}

const dbm = new DatabaseManipulator()

/*
examples
ADD/DROP song
ADD static song
ADD property LOCALIZATION_NAME

IN song SET name TEXT
IN static song SET name TEXT
IN property LOCALIZATION_NAME SET name TEXT

IN song DROP name

IN song MAP .name -> .names[0] (* represents arrayfication *)
IN song MAP .names[*] -> .names[*].name (* array mapping *)
IN song MAP .names[0] -> .name (de-arrayfication, I doubt I'll ever use it though)
IN song MAP .name -> .name.name (one to one mapping)

TRANSFER song [*] TO authors
TRANSFER song [1, 2] TO authors
TRANSFER song [1...3] TO authors
*/
