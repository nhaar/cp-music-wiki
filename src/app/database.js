const jsondiffpatch = require('jsondiffpatch')

const { capitalize } = require('./utils')
const { getHash, generateToken } = require('./crypto')

const handler = require('./sql-handler')

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

const clsys = require('./class-system')

/**
 * Contains the methods to communicate with the database
 * via a defined database structure
 */
class WikiDatabase {
  /**
   * Connect to the database using the class definitions given
   * @param {DefMap} mainClasses
   * @param {DefMap} helperClasses
   * @param {DefMap} staticClasses
   */
  constructor () {
    // general class information processing

    // create table for patches
    handler.create(`
      revisions (
        id SERIAL PRIMARY KEY,
        class TEXT,
        item_id INT,
        patch JSONB,
        wiki_user INT,
        approver INT,
        timestamp NUMERIC,
        minor_edit INT
      )
    `)

    // user table
    handler.create(`
      wiki_users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        user_password TEXT,
        display_name TEXT,
        session_token TEXT,
        created_timestamp NUMERIC
      )
    `)

    // save number of classes for preeditor data
    this.classNumber = Object.keys(clsys.mainClasses).concat(Object.keys(clsys.staticClasses)).length

    this.createEditorModels()
  }

  /**
   * Add a revision for a change or creation to the revisions table
   * @param {ClassName} cls - Class of the data being changed
   * @param {Row} row - Row for the data being changed
   * @param {string} token - Session token for the user submitting the revision
   */
  async addChange (cls, row, token) {
    let oldRow
    const isStatic = clsys.isStaticClass(cls)
    if (isStatic) {
      oldRow = await clsys.getStatic(cls)
    } else {
      oldRow = await handler.selectId(cls, row.id)
    }
    if (!oldRow) {
      if (!isStatic) {
        // to add id to row object if creating new entry
        row.id = (await handler.getBiggestSerial(cls))
        // this property is for the updating function only
        row.isNew = true
      }
      oldRow = { data: clsys.defaults[cls] }
    }
    const userId = await this.getUserId(token)

    const delta = jsondiffpatch.diff(oldRow.data, row.data)
    handler.insert(
      'revisions',
      'class, item_id, patch, wiki_user, timestamp',
      [cls, row.id, JSON.stringify(delta), userId, Date.now()]
    )
  }

  /**
   * Get the ID of a user given a session token
   * @param {string} token - Session token
   * @returns {number} - ID of the user
   */
  async getUserId (token) {
    return (await handler.select('wiki_users', 'session_token', token, 'id'))[0].id
  }

  /**
   * Add a revision that represents an item deletion
   * @param {ClassName} cls - Class of the deleted item
   * @param {number} id - ID of the deleted item
   * @param {string} token - Session token for the user submitting the revision
   */
  async addDeletion (cls, id, token) {
    const userId = await this.getUserId(token)
    handler.insert(
      'revisions',
      'class, item_id, wiki_user, timestamp',
      [cls, id, userId, Date.now()]
    )
  }

  /**
   * Update an item from a class in the database
   * @param {ClassName} cls - The class of the item
   * @param {Row} row - Row data for the item
   * @param {string} token - The session token of the user who submitted the update
   */
  async update (cls, row, token) {
    await this.addChange(cls, row, token)
    if (clsys.isStaticClass(cls)) {
      await clsys.updateStatic(cls, row)
    } else {
      await clsys.updateItem(cls, row)
    }
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
        if (type.includes('{')) {
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

  /**
   * Check if a user is an admin
   * @param {string} session - The session token
   * @returns {boolean} True if is an admin
   */
  async isAdmin (session) {
    // currently every user is admin so just check for existence of account
    const account = (await handler.select('wiki_users', 'session_token', session))[0]
    return Boolean(account)
  }

  /**
   * Generate session token if the credentials are correct
   * @param {string} user - Username
   * @param {string} password - Password
   * @returns {string | undefined} The session token if the credentials are correct or undefined if they aren't
   */
  async checkCredentials (user, password) {
    const internalData = (await handler.select('wiki_users', 'name', user))[0]
    if (!internalData) return

    const hash = getHash(password)

    if (internalData.user_password === hash) {
      const sessionToken = generateToken()
      handler.update('wiki_users', 'session_token', 'id', [internalData.id, sessionToken])
      return sessionToken
    }
  }

  /**
   * Create an account in the database
   * @param {string} name - Username of the account
   * @param {string} password - Password of the account
   * @param {string} display - The display name of the account
   */
  async createAccount (name, password, display) {
    const hash = getHash(password)
    handler.insert('wiki_users', 'name, user_password, display_name, created_timestamp', [name, hash, display, Date.now()])
  }

  /**
   * Remove all references of an id of an item from a class
   * across the other classes in the database
   * @param {ClassName} cls - The class of the item being removed
   * @param {number} id - The id of the item being removed
   */
  async deleteReferences (cls, id) {
    const map = clsys.findIdPaths(cls)
    for (const cls in map) {
      const paths = map[cls]
      let items
      if (clsys.isStaticClass(cls)) {
        items = [await clsys.getStatic(cls)]
      } else {
        items = await handler.selectAll(cls)
      }
      for (let j = 0; j < items.length; j++) {
        const item = items[j]
        const { data } = item

        for (let i = 0; i < paths.length; i++) {
          const removed = clsys.removeFromPath(data, paths[i], id)
          if (removed) {
            await this.update(cls, item)
          }
        }
      }
    }
  }

  /**
   * Delete an item from a main class by removing its row in the database
   * and all references of the id in other classes
   * @param {ClassName} cls - Class of the item being deleted
   * @param {number} id - Id of the item to delete
   */
  async deleteItem (cls, id) {
    await handler.delete(cls, 'id', id)
    await this.deleteReferences(cls, id)
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

const db = new WikiDatabase()

module.exports = db
