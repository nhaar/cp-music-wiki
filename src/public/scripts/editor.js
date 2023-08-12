import { GridModule, MoveableRowsModule } from './modules/array-modules.js'
import {
  CheckboxModule, DateInputModule, NumberInputModule, TextAreaModule,
  TextInputModule, getFileUploadModule, getOptionSelectModule, getSearchQueryModule
} from './modules/element-modules.js'
import { EditorModule, TableChild, TableModule } from './modules/main-modules.js'
import {
  createElement, deepcopy, postAndGetJSON, postJSON,
  selectElement
} from './utils.js'

/* global alert */

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
      const response = await postJSON('api/update', { cls, row })
      if (response.status === 200) {
        alert('Change submitted with success')
        // if (isNaN(row.id)) window.location.href = 'pre-editor'
      } else if (response.status === 400) {
        const resData = await response.json()
        const errorStr = resData.errors.join('\n * ')
        alert(`Improper submission:\n * ${errorStr}`)
      } else if (response.status === 403) {
        alert("You don't have permission to submit")
      }
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
    const { isStatic, cls, main } = editorData

    const id = isStatic ? 0 : Number(params.id)

    Object.assign(this, { isStatic })
    let row
    let data
    if (isNaN(id)) {
      data = await postAndGetJSON('api/default', { cls })
      row = { data }
    } else {
      row = await postAndGetJSON('api/get', { cls, id })
      data = row.data
    }

    console.log(deepcopy(row))
    const Editor = constructEditorModule(main)
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
 * Construct the class for editting a class
 * @param {import('../../app/database.js').CPT} code - Code that defines the class for the editor
 * @param {object} data - Object representing data for the class
 * @param {boolean} topModule - True if building editor for the top module in the page or not
 * @returns {Editor} A module for editting data for a class
 */
function buildEditor (data, topModule) {
  const moduleList = []

  for (const property in data) {
    let value = data[property][0]
    const headerName = data[property][1]
    const desc = data[property][2]
    const args = data[property][3]

    let arrayModule
    const isArray = Array.isArray(value)
    if (isArray) {
      const dim = value[1]
      value = value[0]
      if (dim === 1) {
        arrayModule = MoveableRowsModule
      } else if (dim === 2) {
        arrayModule = GridModule
      }
    }

    let moduleType
    if (typeof value === 'object') {
      moduleType = buildEditor(value, false)
    } else {
      moduleType = {
        TEXTSHORT: TextInputModule,
        TEXTLONG: TextAreaModule,
        ID: getSearchQueryModule(args),
        DATE: DateInputModule,
        BOOLEAN: CheckboxModule,
        FILE: getFileUploadModule(args),
        INT: NumberInputModule,
        SELECT: getOptionSelectModule(args)
      }[value]
    }

    const pushfn = (main, arg) => {
      moduleList.push(new TableChild(headerName, desc, main, property, arg))
    }

    if (isArray) {
      pushfn(arrayModule, moduleType)
    } else {
      pushfn(moduleType)
    }
  }

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
  return buildEditor(editorData, true)
}

const page = new Page()
page.initialize()
