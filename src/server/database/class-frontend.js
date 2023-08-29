const clsys = require('./class-system')
const sql = require('./sql-handler')
const rev = require('./revisions')
const del = require('./deletions')
const { capitalize, matchInside, deepcopy } = require('../misc/server-utils')

class FrontendBridge {
  constructor () {
    // save variables that will be requested by the frontend
    this.createPreeditorData().then(() => this.createEditorData())
  }

  /**
   * Create the object that contains the information for the pre-editor,
   * which consists of an array of objects where each object
   * contains the class name, the pretty name and if the class is static
   * */
  async createPreeditorData () {
    this.preeditorData = []

    const elements = [
      ['main', false],
      ['static', true]
    ]
    for (let i = 0; i < 2; i++) {
      const [category, isStatic] = elements[i]

      const classDefs = clsys.getDefObj(category)
      for (const cls in classDefs) {
        const data = { cls, name: classDefs[cls].name, isStatic }
        if (isStatic) {
          data.id = (await clsys.selectAllInClass(cls))[0].id
        }
        this.preeditorData.push(data)
      }
    }
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
    this.editorData = {}
    this.preeditorData.forEach(data => {
      this.editorData[data.cls] = { main: modelObjects[data.cls] }
    })
  }

  async getDeleteData (id) {
    const cls = (await clsys.getItem(id)).cls

    const deleteData = deepcopy(this.editorData[cls])
    deleteData.refs = await clsys.checkReferences(cls, id)
    return deleteData
  }

  async checkRevisionSize (revId) {
    const text = JSON.stringify(await rev.getRevisionData(revId))
    const encoder = new TextEncoder()
    return encoder.encode(text).length
  }

  async getLastRevisions (days, number) {
    // days is converted to ms
    const timestamp = Date.now() - (days) * 86400000
    const rows = await sql.selectGreaterAndEqual('revisions', 'timestamp', timestamp)
    const classes = clsys.getMajorClasses()
    const latest = []

    for (let i = 0; i < rows.length && i < number + 1; i++) {
      const row = rows[i]
      const next = await rev.getNextRev(row.id)
      const name = await clsys.getQueryNameById(row.item_id)
      const { cls } = row
      if (next) {
        const sizes = [row.id, next]
        for (let i = 0; i < 2; i++) {
          sizes[i] = await this.checkRevisionSize(sizes[i])
        }
        const nextRow = await sql.selectId('revisions', next)
        const delta = sizes[1] - sizes[0]
        const user = (await sql.selectId('wiki_users', nextRow.wiki_user)).name

        latest.push({
          delta,
          timestamp: nextRow.timestamp,
          cls: classes[cls].name,
          name,
          old: row.id,
          cur: next,
          user,
          userId: nextRow.wiki_user,
          id: row.item_id
        })
      }

      if (row.created && row.timestamp > timestamp) {
        latest.push({
          delta: await this.checkRevisionSize(row.id),
          timestamp: row.timestamp,
          cls: classes[cls].name,
          name,
          cur: row.id,
          user: (await sql.selectId('wiki_users', row.wiki_user)).name,
          userId: row.wiki_user,
          id: row.item_id
        })
      }
    }

    // add rollbackable changes
    const foundItems = []

    for (let i = 0; i < latest.length; i++) {
      const change = latest[i]
      if (!foundItems.includes(change.id)) {
        foundItems.push(change.id)
        if (!await del.isDeleted(change.id)) {
          latest[i].rollback = true
        }
      }
    }

    return latest
  }
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
