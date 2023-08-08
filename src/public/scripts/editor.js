import { GridModule, MoveableRowsModule } from './modules/array-modules.js'
import {
  CheckboxModule, DateInputModule, NumberInputModule, TextAreaModule,
  TextInputModule, getFileUploadModule, getSearchQueryModule
} from './modules/element-modules.js'
import { EditorModule, TableChild, TableModule } from './modules/main-modules.js'
import {
  createElement, deepcopy, postAndGetJSON, postJSON,
  selectElement
} from './utils.js'

class Page {
  /** Link page to DOM */
  constructor () {
    this.editor = selectElement('js-editor')
  }

  /** Renders the button for submitting the data at the end of the page */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }

  /**
   * Add control to the submit button
   * @param {Editor} editorModule - Module for the editor
   * @param {import('../../app/database.js').Row} row - Row object for the item
   * @param {string} cls - Name of the class
   */
  setupSubmitButton (editorModule, row, cls) {
    this.submitButton.addEventListener('click', async () => {
      await editorModule.output()
      console.log(deepcopy(row))
      postJSON('api/update', { cls, row, isStatic: this.isStatic })
    })
  }

  /**
   * Initializes the editor by handling the options from the URL
   * and initializing the editor for that class
   */
  async initialize () {
    // get URL params
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)
    const editorData = await postAndGetJSON('api/editor-data', { t: Number(params.t) })

    const id = Number(params.id)

    const { isStatic, cls } = editorData
    Object.assign(this, { isStatic })
    let row
    let data
    if (isStatic) {
      row = await postAndGetJSON('api/get-static', { cls })
      data = row.data
    } else {
      if (id) {
        row = await postAndGetJSON('api/get', { cls, id })
        data = row.data
      } else {
        data = await postAndGetJSON('api/default', { cls })
        row = { data }
      }
    }
    console.log(deepcopy(row))
    const Editor = constructEditorModule(editorData)
    const editor = new Editor(data, this.editor)

    editor.build()
    editor.input()
    editor.setup()

    this.renderSubmitButton()
    this.setupSubmitButton(editor, row, cls)
  }

  /**
   * Converts URL parameters into an object
   * containing the values of each of the query parameters
   * @param {URLSearchParams} urlParams - URL parameters to target
   * @returns {object} Object for the query parameters
   */
  paramsToObject (urlParams) {
    const params = {}
    const paramsArray = [...urlParams.entries()]
    paramsArray.forEach(array => {
      params[array[0]] = array[1]
    })
    return params
  }
}

/**
 * Split all declarations in a CPT code snippet
 * @param {import('../../app/database.js').CPT} code - CPT code
 * @returns {string[]} Array with declarations
 */
function splitDeclarations (code) {
  return code.split('\n').map(line => line.trim()).filter(line => line)
}

/**
 * Match for a pattern than enclosures everything inside two characters
 * @param {string} str - String to match
 * @param {string} lChar - Left character of the enclosure
 * @param {string} rChar - Right character of the enclosure (leave blank for same as left)
 * @returns {object | null} Match result
 */
function matchInside (str, lChar, rChar) {
  if (!rChar) rChar = lChar
  return str.match(`(?<=${lChar}).*(?=${rChar})`)
}

/**
 * Construct the class for editting a class
 * @param {import('../../app/database.js').CPT} code - Code that defines the class for the editor
 * @param {object} data - Object representing data for the class
 * @param {boolean} topModule - True if building editor for the top module in the page or not
 * @returns {Editor} A module for editting data for a class
 */
function buildEditor (code, data, topModule) {
  const lines = splitDeclarations(code)
  const moduleList = []

  lines.forEach(line => {
    const property = line.match(/\w+/)[0]
    const firstWord = '\\w+\\s+'
    const typePattern = '(?:{)?(\\w|\\(|\\))+(?:})?(\\[\\])*'
    let type = line.match(`(?<=${firstWord})${typePattern}`)[0]
    const rest = line.match(`(?<=(${firstWord}${typePattern}\\s+)).*`)
    let params = []
    if (rest) {
      const restString = rest[0]
      const quotePattern = /".*"/
      const quoted = restString.match(quotePattern)
      params = restString.replace(quotePattern, '').match(/\S+/g) || []
      if (quoted) params.push(quoted[0])
    }

    let headerName = 'PLACEHOLDER'
    params.forEach(param => {
      if (param.includes('"')) headerName = matchInside(param, '"')[0]
    })

    const brackets = type.match(/\[\]/g)
    let arrayModule
    if (brackets) {
      type = removeBrackets(type)
      if (brackets.length === 1) {
        arrayModule = MoveableRowsModule
      } else if (brackets.length === 2) {
        arrayModule = GridModule
      }
    }

    let arg = matchInside(type, '\\(', '\\)')

    if (arg) {
      arg = arg[0]
      type = type.replace(/\(.*\)/, '')
    }

    let moduleType
    if (type.includes('{')) {
      type = removeBraces(type)

      moduleType = buildEditor(data[type], data, false)
    } else {
      moduleType = {
        TEXTSHORT: TextInputModule,
        TEXTLONG: TextAreaModule,
        ID: getSearchQueryModule(arg),
        DATE: DateInputModule,
        BOOLEAN: CheckboxModule,
        FILE: getFileUploadModule(arg),
        INT: NumberInputModule
      }[type]
    }

    const pushfn = (main, arg) => {
      moduleList.push(new TableChild(headerName, main, property, arg))
    }

    if (brackets) {
      pushfn(arrayModule, moduleType)
    } else {
      pushfn(moduleType)
    }
  })

  const Extending = topModule ? EditorModule : TableModule

  class Editor extends Extending {
    modules () {
      return moduleList
    }
  }
  return Editor
}

/**
 * Create the editor module for the page
 * @param {object} editorData - Editor data
 * @returns {Editor} Editor module
 */
export function constructEditorModule (editorData) {
  return buildEditor(editorData.main, editorData, true)
}

/**
 * Remove brackets from a string
 * @param {string} str
 * @returns {string}
 */
function removeBrackets (str) {
  return str.replace(/\[|\]/g, '')
}

/**
 * Remove curly braces from a string
 * @param {string} str
 * @returns {string}
 */
function removeBraces (str) {
  return str.replace(/{|}/g, '')
}

const page = new Page()
page.initialize()
