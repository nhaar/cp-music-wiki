const clsys = require('./class-system')
const sql = require('./sql-handler')
const rev = require('./revisions')
const { capitalize } = require('../utils')

class FrontendBridge {
  constructor () {
    // save number of classes for preeditor data
    this.classNumber = Object.keys(clsys.mainClasses).concat(Object.keys(clsys.staticClasses)).length

    this.createEditorModels()
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
      base(clsys[`${element[0]}Classes`], element[1])
    })

    return data
  }

  /**
   * Create the editor model, used by the frontend editor to know how to create the modules
   */
  createEditorModels () {
    const base = (code, obj) => {
      clsys.iterateDeclarations(code, (property, type, params) => {
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
        if (clsys.isHelperType(type)) {
          value = base(
            clsys.helperClasses[type.match('(?<={).*(?=})')[0]].code,
            {}
          )
        } else {
          value = type.match(/\w+/)[0]
        }
        if (clsys.isArrayType(type)) {
          const dim = clsys.getDimension(type)
          value = [value, dim]
        }
        obj[property] = [value, header, description, args]
      })

      return obj
    }

    const mainClasses = clsys.getMainClasses()
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

    return { main: this.modelObjects[cls], cls, isStatic: clsys.isStaticClass(cls) }
  }

  getClassT (cls) {
    const preeditor = this.getPreeditorData()
    for (let t = 0; t < preeditor.length; t++) {
      if (preeditor[t].cls === cls) return t
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
