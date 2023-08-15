const clsys = require('./class-system')
const sql = require('./sql-handler')
const rev = require('./revisions')
const { capitalize } = require('../utils')

class FrontendBridge {
  constructor () {
    // save variables that will be requested by the frontend
    this.createPreeditorData()
    this.createEditorData()
  }

  /**
   * Create the object that contains the information for the pre-editor,
   * which consists of an array of objects where each object
   * contains the class name, the pretty name and if the class is static
   * */
  createPreeditorData () {
    this.preeditorData = [];

    [
      ['main', false],
      ['static', true]
    ].forEach(element => {
      const classDefs = clsys.getDefObj(element[0])
      for (const cls in classDefs) {
        this.preeditorData.push({ cls, name: classDefs[cls].name, isStatic: element[1] })
      }
    })
  }

  /**
   * Create the editor models, to be used by the editor in the frontend
   * @returns {object} An object that maps classes to "editor models", which are objects that represent the structure of a class, each property in the editor model is a property in a class, if the property is a helper class, then the editor model shows the editor model for that class, if it is a normal type, it shows the string, and if it is an array, it shows what type the array is of and what its dimension is
   */
  createEditorModels () {
    // the function takes a CPT snippet, presumed to be
    // what defines the object, returns the model following the snippet
    const getModel = code => {
      const obj = {}
      clsys.iterateDeclarations(code, (property, type, params) => {
        const sandwichVariables = {}
        const applySandwich = (param, char, name) => {
          if (param.includes(char)) {
            sandwichVariables[name] = param.match(`(?<=${char}).*(?=${char})`)[0]
          }
        }
        params.forEach(param => {
          [
            ['"', 'header'],
            ["'", 'description']
          ].forEach(element => {
            applySandwich(param, ...element)
          })
        })

        // create automatically generated header if no header
        const header = sandwichVariables.header || camelToPhrase(property)
        const description = sandwichVariables.description || ''

        // extrat arguments from type
        let args = matchInside(type, '\\(', '\\)')
        if (args) {
          args = args[0].split(',')
          if (args.length === 1) args = args[0]
          type = type.replace(/\(.*\)/, '')
        }

        // if the value is a helper type, it will become an object recursivelly
        // until the lowest level where the value will be a string
        let value
        if (clsys.isHelperType(type)) {
          value = getModel(clsys.helperClasses[matchInside(type, '{', '}')[0]].code)
        } else {
          value = type.match(/\w+/)[0]
        }
        // array types will just include the value inside of an array to indicate it is
        // an array type
        if (clsys.isArrayType(type)) {
          const dim = clsys.getDimension(type)
          value = [value, dim]
        }
        obj[property] = [value, header, description, args]
      })

      return obj
    }

    const classes = clsys.getMajorClasses()
    const modelObjects = {}
    for (const cls in classes) {
      const code = classes[cls].code
      modelObjects[cls] = getModel(code)
    }

    return modelObjects
  }

  /** Create the editor data object, which is used by the frontend */
  createEditorData () {
    const modelObjects = this.createEditorModels()
    this.editorData = []
    this.preeditorData.forEach((data) => {
      const { cls } = data
      this.editorData.push(
        { main: modelObjects[cls], cls, isStatic: clsys.isStaticClass(cls) }
      )
    })
  }

  /**
   * Get what is the value of `t` (the index in the pre-editor data)
   * of a class
   * @param {import('./class-system').ClassName} cls - Name of the class
   * @returns {number} The value of the index
   */
  getClassT (cls) {
    for (let t = 0; t < this.preeditorData.length; t++) {
      if (this.preeditor[t].cls === cls) return t
    }
  }

  async getLastRevisions (days) {
    const timestamp = Date.now() - days * 24 * 3600 * 1000
    const rows = await sql.selectGreater('revisions', 'timestamp', timestamp)

    const classes = clsys.getMainClasses()

    const latest = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const cls = row.class
      const name = await clsys.getQueryNameById(cls, row.item_id)
      const previous = await rev.getNextRev(row.id)
      const diff = `<a href="Diff?old=${previous}&cur=${row.id}">diff</a>`
      const user = (await sql.selectId('wiki_users', row.wiki_user)).display_name
      latest.push(`(${diff} | history) .. <a href="editor?t=${this.getClassT(cls)}&id=${row.item_id}">${classes[cls].name} | ${name}</a>  [${user}]`)
    }

    return latest
  }
}

/**
 * Match for a pattern than enclosures everything inside two characters
 * @param {string} str - String to match
 * @param {string} lChar - Left character of the enclosure
 * @param {string} rChar - Right character of the enclosure, leave blank for same as left
 * @returns {object | null} Match result
 */
function matchInside (str, lChar, rChar) {
  if (!rChar) rChar = lChar
  return str.match(`(?<=${lChar}).*(?=${rChar})`)
}

/**
 * Separates the words in a camel case name and capitalize the first letter
 * of each word
 * @param {string} str - Camel case string
 * @returns {string} Converted string
 */
function camelToPhrase (str) {
  const firstWord = str.match(/[a-z]+((?=[A-Z])|$)/)[0]
  const otherWords = str.match(/[A-Z][a-z]*/g)
  return [capitalize(firstWord)].concat(otherWords).join(' ')
}

module.exports = new FrontendBridge()
