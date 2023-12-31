const { trimArray, getMatch, matchInArray, getExtremeCharEnclosurePattern } = require('../misc/common-utils')
const { matchGroup, capitalize, matchInside } = require('../misc/server-utils')

/**
 * "Cascading Property Types" is the syntax used to define how the item `data` object of items are structured in each item class
 *
 * A `CPT` string contains a series of statements, also called declarations, and each statement defines a property of
 * the `data` object
 *
 * A statement takes the form:
 *
 * `property type params;`
 *
 * Of which `property` is the name of the property in `data`, `type` refers to the type of data the property stores (details)
 * below, and `params` are a sequence words with extra functionalities. The semi-colon marks end of the stament. The space
 * between each word can be any thing, including line breaks.
 *
 * In-depth information about each part:
 *
 * # `property`
 *
 * The simplest of it all, all it needs is to be a camel case string. It should describe well what the property means.
 *
 * # `type`
 *
 *
 * A `type` is built with a base word which represents the fundamental datatype it represents.
 *
 * ## Base types
 *
 * These are the list of
 * base types supported
 *
 * * `TEXTSHORT` - A short, single line string
 * * `TEXTLONG` - A string of any size, supporting multiple lines
 * * `INT` - An integer number
 * * `BOOLEAN` - Normal boolean
 * * `DATE` - A string that represents a date in the format YYYY-MM-DD
 * * `ID` - An integer greater than zero that represents an item id from a class decided by its arguments
 * * `FILE` - An object that stores data of a file in the public folder with the properties `originalname`, which is a string
 * * `SELECT` - A string from a set of predefined options defined by its arguments
 * with the name of the file before it was uploaded, and `filename`, which is a string with the name of the file as it is
 * saved in the public folder
 *
 * ## Custom object types
 *
 * Besides the base types, it is also possible to use custom object types which represent an object, also known as
 * helper classes, once defined elsewhere they can be called using the helper class name surrounded by curly
 * brackets: `{CUSTOM_TYPE}`
 *
 * ## Arrays
 *
 * An array of a datatype can be created adding closed brackets at the end of the type, for example:
 *
 * `INT[]` represents an array of `INT`, like `[1, 3, 5]`
 *
 * In this context arrays are like JavaScript arrays which are not fixed in size
 *
 * Arrays of higher dimension can be giving writing more brackets. For example, for a two dimensional array of integers:
 *
 * `INT[][]` represents a two dimensional array like `[[1, 2], [2, 3]]`
 *
 * ## Arguments
 *
 * A datatype may require an argument, which is implemented using parenthesis `()` after the name, for example, `ID()`.
 * Multiple arguments are separated by commas. These are the types that take arguments:
 *
 * * ID: Takes as an argument the item class name the id belongs to
 *
 * * SELECT: Takes as arguments the options of the select. Each option is of the form `[id text]` where `id` is any string
 * to identify the choice and `text` is a string with any text to describe the option
 *
 * # `params`
 *
 * `params` represent any extra options appended at the end of the statement and do special actions. Below are
 * the available parameters.
 *
 * ## `QUERY` parameter
 *
 * Appending `QUERY` as a parameter will make it so any value the property takes will be added to the `querywords` of the
 * item, which is used to identify or name the items.
 *
 * ## `"..."` parameter
 *
 * Adding text enclosed by double quote can be used to give the property a "pretty name". Whenever the property is referenced
 * in the frontend UI, it will use the pretty name, which by default is the property name converted from camel case. If
 * the property name isn't satisfactory to fully describe it, a special name can be used
 *
 * ## `'...'` parameter
 *
 * Adding text enclosed by single quotes can be used to give the property a description of what it is. This description will
 * be shown in the frontend UI to aid people understand what this property represents
 *
 * ## `*` parameter
 *
 * Adding `*` as a parameter will make it so anyone can edit this property
 * @typedef {string} CPT
 */

/**
 * Array with all property info inside an object, in the order they should apear
 * @typedef {PropertyInfo[]} ObjectStructure
 */

/**
 * Object that contains the info for a `property` inside an item's `data`
 * @typedef {object} PropertyInfo
 * @property {string} property - Name of the property
 * @property {boolean} array - `true` if the property is an array, `false` otherwise
 * @property {number} dim - If array is `true`, this property is the dimension of the array
 * @property {string | ObjectStructure} content - Either a string representing the base type or if it is an object type, an array of all `PropertyInfo`s for its properties
 * @property {boolean} query - `true` if this property is a query property, `false` otherwise
 * @property {string} name -
 * @property {string} desc
 * @property {ItemRuleValidator[]} validators
 */

/**
 * An object with multiple object definitions as the value and the keys being their identifier name
 * @typedef {Object.<string, CustomObjectDef>} DefSheet
 */

/** Class with methods to interprept `CPT` */
class CPTInterpreter {
  /**
   * Store all object types
   * @param {DefSheet} objectTypes - All the defined objects
   */
  constructor (objectTypes) {
    Object.assign(this, { objectTypes })
  }

  /**
   * Split all declarations in a `CPT` string
   * @param {CPT} cpt - `CPT` string
   * @returns {string[]} Array with declarations
   */
  static splitDeclarations (cpt) {
    const allDeclrs = trimArray(cpt.split(';'))
    const cleanedDeclrs = []
    allDeclrs.forEach(declr => {
      const cleaned = trimArray(declr.split('\n')).join(' ')
      cleanedDeclrs.push(cleaned)
    })
    return cleanedDeclrs
  }

  /**
   * Remove the argument of a `type`
   * @param {string} type - `type` as declared
   * @returns {string} `type` declared with no arguments
   */
  static removeArgs (type) {
    return type.replace(/\(.*\)/, '')
  }

  /**
   * Get the array dimension for a `type` declaration
   * @param {string} type - `type` as declared
   * @returns {number} Array dimension, 0 if not an array
   */
  static getDimension (type) {
    const matches = type.match(/\[\]/g)
    if (matches) return matches.length
    else return 0
  }

  /**
   * Iterate through every property declaration in a `CPT` striong and run a function for each statement
   * @param {string} cpt - `CPT` string
   * @param {function(string, string, string[]) : void} callbackfn - Callback function for each declaration which takes as the first argument the `property`, as the second argument the `type` and as the third an array of all `param`s
   */
  static iterateDeclarations (cpt, callbackfn) {
    const declarations = CPTInterpreter.splitDeclarations(cpt)
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
   * Check if a `CPT` `type` declaration represents a declaration of an array
   * @param {string} type - `type` as declared
   * @returns {boolean} `true` if it represents an array, `false` otherwise
   */

  static isArrayType (type) {
    return type.match(/\[\]/)
  }

  /**
   * Check if a `CPT` `type` declaration represents a declaration of a matrix
   * @param {string} type - `type` as declared
   * @returns {boolean} `true` if it represents a matrix, `false` otherwise
   */
  static isMatrix (type) {
    return type.match(/\[\]/g).length === 2
  }

  /**
   * Check if a `CPT` `type` declaration represents a declaration of a custom object type
   * @param {string} type - `type` as declared
   * @returns {boolean} `true` if it represents a custom object type, `false` otherwise
   */
  static isObjectType (type) {
    return type.includes('{')
  }

  /**
   * Separates the words in a camel case name and capitalize the first letter of each word
   * @param {string} str - Camel case string
   * @returns {string} Converted string
   */
  static camelToPhrase (str) {
    const firstWord = str.match(/[a-z]+((?=[A-Z])|$)/)[0]
    const otherWords = str.match(/[A-Z][a-z]*/g)
    return [capitalize(firstWord)].concat(otherWords).join(' ')
  }

  /**
   * Interpret all the `CPT` strings inside a `DefSheet`
   * @param {DefSheet} classes - Object with `CPT` to interpret
   * @returns {Object.<string, PropertyInfo>} Object of strings of class names mapped to their `PropertyInfo` object
   */
  interpretCPT (classes) {
    const output = {}
    for (const cls in classes) {
      output[cls] = this.parseCPTString(classes[cls].code, this.objectTypes)
      output[cls].validators = classes[cls].validators
    }

    return output
  }

  /**
   * Parse a `CPT` string into the object representing the property's structure
   * @param {CPT} cpt - `CPT` string
   * @returns {PropertyInfo} Object with property structure
   */
  parseCPTString (cpt) {
    const parsed = []
    CPTInterpreter.iterateDeclarations(cpt, (prop, type, params) => {
      const propObj = { property: prop }

      propObj.array = CPTInterpreter.isArrayType(type)
      if (propObj.array) {
        propObj.matrix = CPTInterpreter.isMatrix(type)
        type = getMatch(type, /.*?(?=\[\]+)/)
      } else {
        propObj.matrix = false
      }

      const args = (getMatch(type, /(?<=\().*(?=\))/) || '').split(',')
      propObj.args = args
      type = CPTInterpreter.removeArgs(type)

      let content = type

      if (CPTInterpreter.isObjectType(type)) {
        propObj.object = true
        type = matchInside(type, '{', '}')
        content = this.parseCPTString(this.objectTypes[type].code, this.objectTypes)
        propObj.validators = this.objectTypes[type].validators
      } else propObj.object = false

      Object.assign(propObj, { content })

      // query param
      propObj.query = params.includes('QUERY')

      const matchEnclosure = char => matchInArray(params, getExtremeCharEnclosurePattern(char))

      propObj.name = matchEnclosure('"') || CPTInterpreter.camelToPhrase(prop)
      propObj.desc = matchEnclosure("'") || ''

      // permission
      propObj.anyone = params.includes('*')

      parsed.push(propObj)
    })

    return parsed
  }
}

const cptIntrepreter = new CPTInterpreter(require('./custom-object-types'))

module.exports = cptIntrepreter
