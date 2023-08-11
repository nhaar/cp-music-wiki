/*
this file is not accessed by any other file, it is meant to be run standalone
every time a change to the database must be made, this must be accessed first
*/
const db = require('./database')
const jsondiffpatch = require('jsondiffpatch')
const { deepcopy, removeBraces } = require('./utils')

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
 * Represents code for the query language for retro-updates
 * @typedef {string} RUL
 */

/**
 * Get all the versions of a row throughout all patches applied to it
 * @param {import('./database').ClassName} table - Name of the class the row belongs to
 * @param {number} id - Id of the row
 * @param {import('./database').ItemData} defaultData - Default object to be used as the "0th" version
 * @returns {VersionList} Fetched version list
 */
async function getAllVersions (cls, id, defaultData) {
  const versions = [defaultData]
  const patches = await db.handler.selectPatches(cls, id)
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
 * @param {import('./database').ClassName} type - Class of the row
 * @param {number} id - Id for the row
 * @param {VersionList} versions - All the versions to save
 */
async function overridePatches (cls, id, versions) {
  const patchIds = await db.handler.selectPatchIds(cls, id)
  if (versions.length - 1 !== patchIds.length) throw new Error('Versions given cannot describe the patches to override')
  patchIds.forEach((id, i) => {
    const patch = JSON.stringify(jsondiffpatch.diff(versions[i], versions[i + 1]))
    db.handler.update('revisions', 'patch', 'id', [id, patch])
  })
}

const patterns = {
  table: /\w+/,
  inDeclr: /IN\s+/,
  word: word => new RegExp(`\\s+${word}\\s+`),
  path: /(\.\w+|\[[^\]]*\])*/,
  typePattern: /(?:{)?\w+\(([^)]*)\)(?:})?(\[\])*/
}

class DatabaseManipulator {
  /**
   * Evaluates RUL and updates the database accordingly
   * @param {RUL} code
   */
  async eval (code) {
    const matches = this.collectCommands(code)

    /** Map for class -> associated statements */
    const classMap = {}

    /** The original default class data before being updated */
    const originalDefaults = {}

    const allClasses = db.getAllClasses()
    for (const cls in allClasses) {
      originalDefaults[cls] = deepcopy(db.defaults[cls])
    }

    // run all add commands
    matches.add.forEach(statement => this.evaluateAdd(statement))

    const inCls = /(?<=IN\s+)\w+/
    const { typePattern } = patterns
    const matchProperty = (str, method) => str.match(`(?<=${method}\\s+)\\w+`)[0]
    const matchType = (str, method) => matchGroup(str, undefined, `(?<=${method}\\s+\\w+\\s+)`, typePattern)[0]

    const base = (method, callback, codeCallback) => statement => {
      const cls = statement.match(inCls)[0]
      let property
      let type
      if (method) {
        property = matchProperty(statement, method)
        const typeMatch = matchType(statement, method)
        // in particular, DROP does not have types
        if (typeMatch) type = typeMatch[0]
      }
      if (callback) callback(cls, property, type)
      if (codeCallback) {
        const clsRef = db.getAnyClass(cls)
        codeCallback(clsRef, property, type)
      }
      if (!classMap[cls]) classMap[cls] = []
      classMap[cls].push(statement)
    }

    matches.drop.forEach(base('DROP', (cls, property) => {
      this.dropInObject(db.defaults[cls], property)
    }, (clsRef, property) => {
      clsRef.code = clsRef.code.replace(new RegExp(`.*${property}[^;]*;`), '')
    }))

    matches.set.forEach(base('SET', (cls, property, type) => {
      this.setInObject(db.defaults[cls], property, type)
    }, (clsRef, property, type) => {
      if (clsRef.code.match(`${property}`)) {
        clsRef.code = clsRef.code.replace(groupPatterns(`(?<=${property}\\s+)`, typePattern, /.*/), type)
      } else {
        clsRef.code += `${property} ${type}`
      }
    }))

    matches.map.forEach(base())

    for (const cls in classMap) {
      const statements = classMap[cls]
      this.updatePatches(cls, originalDefaults[cls], version => {
        const original = deepcopy(version)
        statements.forEach(statement => {
          if (statement.includes('DROP')) {
            const property = matchProperty(statement, 'DROP')
            this.dropInObject(version, property)
          } else if (statement.includes('SET')) {
            const property = matchProperty(statement, 'SET')
            const type = matchType(statement, 'SET')
            this.setInObject(version, property, type)
          } else {
            const pathPattern = patterns.path
            const args = [statement, undefined]
            const ptrns = [pathPattern, /(?=\s+->)/]
            const paths = [0, 1].map(i => {
              const patternArgs = [ptrns[i % 2], ptrns[(i + 1) % 2]]
              return matchGroup(...args.concat(patternArgs))[0]
            })
            this.mapInObject(original, version, paths[0], paths[1], cls)
          }
        })
        return version
      })
    }

    console.log(db.helperClasses, db.defaults)
  }

  /**
   * Organize all the statement types used in the provided code
   * @param {RUL} code
   * @returns {object} Object with the keys `add`, `drop`, `set`, `map`, `transfer`, each containing a list of statements
   */
  collectCommands (code) {
    const { inDeclr, typePattern, word, path } = patterns

    const matchfn = (...expressions) => {
      return matchGroup(code, 'g', ...expressions)
    }
    const inPatterns = (...expressions) => {
      return [inDeclr, /\w+/, ...expressions]
    }

    const inWord = (w, ...expressions) => {
      return inPatterns(word(w), ...expressions)
    }

    const matches = {
      add: [/ADD\s+\w+\s+\w+/],
      drop: inPatterns(/\s+DROP\s+\w+/),
      set: inWord('SET', /\w+\s+/, typePattern),
      map: inWord('MAP', path, /\s+->\s+/, path),
      transfer: [/TRANSFER\s+/, /\w+/, /\s+\[(\*|\d+(?:\s*(,|...)\s*\d+)*)\]\s+/, /\w+/, /\s+\w+/]
    }

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
    const category = words[1]
    const cls = words[2]
    console.log(category)
    switch (category) {
      case 'main': {
        db.handler.createClass(cls)
        break
      }
      case 'static': {
        db.handler.insertStatic(cls, {})
        break
      }
    }
    db[`${category}Classes`][cls] = {}
    db.defaults[cls] = {}
  }

  /**
   * Apply the set method in a JS object
   * @param {object} object - Target
   * @param {string} property - First argument of method
   * @param {string} type - Second argumment of method
   */
  setInObject (object, property, type) {
    if (db.isArrayType(type)) {
      object[property] = []
    } else if (type.includes('{')) {
      object[property] = db.defaults[removeBraces(type)]
    } else {
      object[property] = null
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
   * @param {string} cls - Class of the object being handled
   */
  mapInObject (object1, object2, path1, path2, cls) {
    const paths = [path1, path2]
    const steps = paths.map(path => path.match(/(?<=\.)\w+|(?<=\[).(?=\])/g))
    const tpath = this.getTypePath(cls, steps[1].slice(0, steps.length - 1))

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

      const getNewValue = () => {
        if (curType === '[]') return []
        else return deepcopy(db.defaults[curType])
      }

      // the last step we will assign, while in these others
      // we will just access the references
      if (i < steps[1].length - 1) {
        // if reached a star, assume that currentReading is an array
        // and iterate through all of them
        if (step === '*') {
          currentReading.forEach(nextReading => {
            // since object2 is a default one,
            // need to add the values to the array
            const next = getNewValue()
            assigning.push(next)
            assignIterator(next, nextReading, i + 1)
          })
        } else {
          // no iteration needed, simply go forward
          const next = assigning[step]
          if (!next) {
            // in case next step doesn't exist
            assigning[step] = getNewValue()
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

  /**
   * Gets the property types in a path
   * @param {import('./database').ClassName} cls - Class of the object the path relates to
   * @param {string[]} steps - An array with the steps in the path, consisting of either digit and * for arrays or a property name
   * @returns {string[]} - List of the types
   */
  getTypePath (cls, steps) {
    const tpath = []
    let type = cls
    // unify all classes because the cls will be first
    // assigned the given class and it can then point to helper classes
    const allClasses = db.getAllClasses()
    steps.forEach(step => {
      // ignore if it is a number or it's just the *
      // because that represents an array element ie there is no type of interest
      if (isNaN(step) && step !== '*') {
        // if here, assume the type is a class
        const code = allClasses[type].code

        // type is found through the CPT for the property
        const typeMatch = matchGroup(code, '', `(?<=${step}\\s+)`, patterns.typePattern)[0]

        // remove any possible brackets by matching whole word
        type = typeMatch.match(/\w+/)[0]
        let dim = 0
        if (typeMatch.includes('[')) dim = typeMatch.match(/\[\]/g).length
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
   * @param {import('./database').ClassName} cls - Class to change
   * @param {import('./database').ItemData} defaultData - Default object for the class
   * @param {function(ItemData) : ItemData} callback - Function that takes as the argument a given version of an object and gives back a modified one. All the patches will then be based on the newly created versions and replace the previous ones
   */
  async updatePatches (cls, defaultData, callback) {
    const versionBase = async (cls, id) => {
      const versions = await getAllVersions(cls, id, defaultData)
      versions.forEach(version => callback(version))
      overridePatches(cls, id, versions)
    }

    if (db.isStaticClass(cls)) {
      await versionBase(cls, 0)
    } else {
      // find biggest ID to iterate through everything
      const seq = await db.handler.getBiggestSerial(cls)
      // iterate every ID, presuming no deletion
      for (let i = 1; i <= seq; i++) {
        await versionBase(cls, i)
      }
    }
  }
}

function groupPatterns (...patterns) {
  const sources = (patterns.map(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.source
    } else return pattern
  }))
  const combined = sources.reduce((accumulator, cur) => {
    return accumulator + cur
  }, '')
  return new RegExp(combined)
}

function matchGroup (str, flags, ...patterns) {
  console.log(new RegExp(groupPatterns(...patterns), flags))
  return str.match(new RegExp(groupPatterns(...patterns), flags))
}

const dbm = new DatabaseManipulator()

/*

****** all commands
ADD main cls
ADD static cls
ADD helper cls

IN cls SET
IN cls DROP
IN cls MAP

TRANSFER cls TO cls

DELETE cls

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
