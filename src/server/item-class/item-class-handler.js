const { keysInclude } = require('../misc/common-utils')
const ObjectPathHandler = require('../misc/object-path-handler')
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
      pathMap[cls] = ObjectPathHandler.findItemPathFromStructure(this.classes[cls].structure, condition)
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
   * Check if a string is a valid item class name
   * @param {string} str
   * @returns {boolean} `true` if it is a class name, `false` otherwise
   */
  isClassName (str) {
    return keysInclude(this.classes, str)
  }

  getPrettyName (cls) {
    return this.classes[cls].name
  }
}

module.exports = {
  ItemClassHandler,
  itemClassHandler: new ItemClassHandler(require('./item-classes'), require('./predefined'))
}
