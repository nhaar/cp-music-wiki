/**
 * An array that represents a path of properties within an ITEM's data object. Each string is either a name of a property, or
 * a closed double brackets indicating that it is an array element
 *
 * For example, the path `['names', '[]']` represents all elements of the array under the `names` property in the following
 * data object:
 *
 * ```js
 * {
 *   names: [
 *     {
 *       id: 'somehash1',
 *       value: 1
 *     },
 *     {
 *       id: 'somehash2',
 *       value: 2
 *     }
 *   ]
 * }
 * ```
 *
 * and the path `['data', 'name']` is the element under the `name` property in the following nested data object:
 * `
 * {
 *   data: {
 *     name: 'Name'
 *   }
 * }
 * `
 * @typedef {string[]} ItemPath
 */

/**
 * An array of properties/indexes that leads to a value inside a (regular JavaScript) object.
 *
 * For example:
 *
 * `['names', 0, 'name']`
 *
 * In the object
 *
 * ```js
 * {
 *   names: [
 *     {
 *       name: 'Hello World'
 *     }
 *   ]
 * }
 * ```
 *
 * leads ot the value `Hello World`. The index of arrays can be either string or numbers.
 *
 * @typedef {(string | number)[]} ObjectPath
 */

/** Class that handles everything related to object and item paths */
class ObjectPathHandler {
  /**
   * Walk through a path within an item's data object and return all values in the path
   * @param {ItemPath} path - Desired path
   * @param {object} obj - Data object to travel
   * @returns {any[] | undefined} A list of all found values or `undefined` if the path doesn't exist
   */
  static travelItemPath (path, obj) {
    const found = []
    const iterate = (value, current) => {
      const type = path[current]
      current++
      if (current === path.length + 1) found.push(value)
      else if (type === '[]') {
        value.forEach(element => {
          iterate(element.value, current)
        })
      } else {
        if (value === undefined) return
        const nextValue = value[type]
        iterate(nextValue, current)
      }
    }

    iterate(obj, 0)
    return found
  }

  /**
   * Get all `ObjectPath`s that apply to a given object based on an `ItemPath`.
   *
   * In essence what this method does is to multiple the number of paths for all the available array indexes and the values, for example,
   * if the path looks like `['prop', '[]']`, and `prop` stores an array of two elements, the output will be the array
   * `[['prop', 0, 'value'], ['prop', 1, 'value']]`
   *
   * (Expand indices, and add value after each index)
   * @param {ItemPath} itemPath - Item path
   * @param {object} object - Object to base off
   * @returns {ObjectPath[]} All found object paths
   */
  static getObjectPathsFromItemPath (itemPath, object) {
    const objectPaths = []

    /**
     * Advance one level deep into the property array, updating the `objectPaths` if reached the last level
     * @param {object} object - State of the current object, each level the object is transformed into one of its properties
     * @param {ObjectPath} objPath - Path that leads to the current object from the original object
     * @param {number} current - Index for the depth of the property path
     */
    function iterate (object, objPath = [], current = 0) {
      if (current < itemPath.length) {
        const step = itemPath[current]
        current++
        if (step === '[]') {
          object.forEach((e, i) => {
            iterate(e.value, [...objPath, 'value', i], current)
          })
        } else {
          iterate(object[step], [...objPath, step], current)
        }
      } else {
        objectPaths.push(objPath)
      }
    }

    iterate(object)
    return objectPaths
  }

  /**
   * Read what value is stored by an object at a certain path
   * @param {object} obj - Object to read
   * @param {ObjectPath} path - Path to property
   * @returns {any | Error} The object stored, or `Error` if the path was not found
   */
  static readObjectPath (obj, path) {
    let value = obj
    for (let i = 0; i < path.length; i++) {
      try {
        value = value[path[i]]
      } catch (err) {
        if (err.name === 'TypeError') return err
        else throw err
      }
    }
    return value
  }

  /**
   * Set the property inside an object to a value
   * @param {object} obj - Target object
   * @param {ObjectPath} path - Path to the property
   * @param {any} value - Value to set the property to
   */
  static setObjectPath (obj, path, value) {
    let cur = obj
    path.forEach((step, i) => {
      if (i === path.length - 1) cur[step] = value
      else cur = cur[step]
    })
  }

  /**
   * For two given objects with the same structure, transfer the value of a property that sits in a certain path from an
   * origin object to a target object (this only alters the target object)
   * @param {object} obj1 - Origin object
   * @param {object} obj2 - Target object
   * @param {ObjectPath} path - Path to the property
   * @returns {boolean} `true` if the transfer was done successfully, `false` otherwise
   */
  static transferValue (obj1, obj2, path) {
    const value = ObjectPathHandler.readObjectPath(obj1, path)
    if (value instanceof Error) return false
    ObjectPathHandler.setObjectPath(obj2, path, value)
    return true
  }

  /**
   * Find the path to all properties within an item's `data` object to which their property definition follow a given
   * condition
   * @param {ObjectStructure} structure - The item class' `data` object structure
   * @param {function(PropertyInfo) : boolean} condition - Check the `ItemClassHandler.findPaths` docs
   * @returns {ItemPath[]} A list of all the found property paths
   */
  static findItemPathFromStructure (structure, condition) {
    const paths = []
    const iterate = (structure, path = []) => {
      structure.forEach(prop => {
        const newPath = [...path, prop.property]
        if (prop.array) {
          for (let i = 0; i < prop.dim; i++) {
            newPath.push('[]')
          }
        }
        if (condition(prop)) {
          paths.push(newPath)
        } else if (prop.object) {
          iterate(prop.content, newPath)
        }
      })
    }
    iterate(structure)
    return paths
  }
}

module.exports = ObjectPathHandler
