const { keysInclude } = require('../misc/common-utils')
const cptIntrepreter = require('./cpt-interpreter')

/**
 * Object with the processed information for an item class
 * @typedef {object} InterpretedClassDef
 * @property {string} name - Pretty name for the class
 * @property {ObjectStructure} structure - Properties of the class' `data`
 * @property {ItemRuleValidator[]} validators - List of validators for the `data` object
 */

/**
 * Very similar to `DefSheet`, except that the `code` property is replaced with a `structure` property with the interpreted
 * `CPT`
 * @typedef {Object.<string, InterpretedClassDef>} ItemObjectSheet
 */

/**
 * An array that represents a path of properties within an object. Each string is either a name of a property, or a closed
 * double brackets indicating that it is an array element
 *
 * For example, the path `['names', '[]']` represents all elements of the array under the `names` property in the following
 * object:
 * `
 * {
 *   names: [1, 2, 3]
 * }
 * `
 *
 * and the path `['data', 'name']` is the element under the `name` property in the following nested object:
 * `
 * {
 *   data: {
 *     name: 'Name'
 *   }
 * }
 * `
 * @typedef {string[]} PropertyPath
 */

/** Class that handles the interpreted classes */
class ItemClassHandler {
  /**
   * Create a handler out of uninterpreted class definitions
   * @param {object} itemClasses - Object with the keys `dynamic` and `static`, each with a `DefSheet` for the respective dynamic and static classes
   * @param {object[]} predef - Array with all the predefined item objects
   */
  constructor (itemClasses, predef) {
    this.dynamicClasses = ItemClassHandler.getInterpretedClasses(itemClasses.dynamic)
    this.staticClasses = ItemClassHandler.getInterpretedClasses(itemClasses.static)
    this.classes = { ...this.dynamicClasses, ...this.staticClasses }
    this.assignDefaults()
    Object.assign(this, { predef })
  }

  /**
   * Interpret all the `CPT` strings within a `DefSheet`
   * @param {DefSheet} classes - Object with the definitions and their `CPT` string
   * @returns {ItemObjectSheet} Object with the strings replaced with their interpreted structure
   */
  static getInterpretedClasses (classes) {
    const interpreted = cptIntrepreter.interpretCPT(classes)
    const output = { ...classes }
    for (const cls in classes) {
      delete output[cls].code
      output[cls].structure = interpreted[cls]
    }
    return output
  }

  /**
   * Get what the default `data` object for an item following its structure is
   * @param {ObjectStructure} structure `data` object's structure
   * @returns {object} Default `data` object
   */
  static getDefault (structure) {
    const defaultObject = {}
    structure.forEach(prop => {
      if (prop.array) defaultObject[prop.property] = []
      else {
        if (prop.object) {
          defaultObject[prop.property] = ItemClassHandler.getDefault(prop.content)
        } else {
          const value = {
            BOOLEAN: false
          }[prop.content]
          defaultObject[prop.property] = value === undefined ? null : value
        }
      }
    })
    return defaultObject
  }

  /**
   * Get the default `data` object for multiple item classes
   * @param {ItemObjectSheet} classes - Sheet with the item classes
   * @returns {Object.<string, object>} Object mapping a class name to its default `data` object
   */
  static getClassesDefaults (classes) {
    const defaults = {}
    for (const cls in classes) {
      defaults[cls] = ItemClassHandler.getDefault(classes[cls].structure)
    }
    return defaults
  }

  /** Save the default object map for each class in the instance */
  assignDefaults () {
    this.defaults = {};
    [this.dynamicClasses, this.staticClasses]
      .forEach(classes => { Object.assign(this.defaults, ItemClassHandler.getClassesDefaults(classes)) })
  }

  /**
   * Find all the paths in all item classes that lead to a `type` or `param` following a specific condition
   * @param {function(PropertyInfo) : boolean} condition - Function takes a propertie's info and returns `true` if the path to this property should be included, `false` otherwise
   * @return {Object.<string, PropertyPath[]>} Object mapping each class name to an array of all the desired paths within the class' `data` object
   */
  findPaths (condition) {
    const pathMap = {}
    for (const cls in this.classes) {
      pathMap[cls] = []

      const iterate = (structure, path) => {
        structure.forEach(prop => {
          const newPath = [...path, prop.property]
          if (prop.array) {
            for (let i = 0; i < prop.dim; i++) {
              newPath.push('[]')
            }
          }
          if (condition(prop)) {
            pathMap[cls].push(newPath)
          } else if (prop.object) {
            iterate(prop.content, newPath)
          }
        })
      }
      iterate(this.classes[cls].structure, [])
    }
    return pathMap
  }

  /**
   * Check if an item class is static
   * @param {string} cls - Class name
   * @returns {boolean} `true` if the class is static `false` if it is dynamic
   */
  isStaticClass (cls) {
    return keysInclude(this.staticClasses, cls)
  }

  /**
   * Walk through a path within an object and return all values in the path
   * @param {PropertyPath} path - Desired path
   * @param {object} obj - Object to travel
   * @returns {any[] | undefined} A list of all found values or `undefined` if the path doesn't exist
   */
  static travelPath (path, obj) {
    const found = []
    const iterate = (value, current) => {
      const type = path[current]
      current++
      if (current === path.length + 1) found.push(value)
      else if (type === '[]') {
        value.forEach(element => {
          iterate(element, current)
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

  isClassName (str) {
    return keysInclude(this.classes, str)
  }
}

module.exports = {
  ItemClassHandler,
  itemClassHandler: new ItemClassHandler(require('./item-classes'), require('./predefined'))
}
