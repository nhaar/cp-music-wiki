import { createElement, deepcopy, postAndGetJSON, postJSON, selectElement } from './utils.js'
import { types } from './type-info.js'

class Page {
  constructor () {
    this.editor = selectElement('js-editor')
  }

  /**
   * Renders the button for submitting the data at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }

  /**
   * Add controls to the submit button
   */
  setupSubmitButton (editorModule, row, type) {
    this.submitButton.addEventListener('click', async () => {
      await editorModule.output()
      console.log(deepcopy(row))
      if (this.isStatic) {
        postJSON('api/update-static', { row })
      } else {
        postJSON('api/update', { type, row })
      }
    })
  }

  /**
   * Initializes the editor by handling the options from the URL
   * and initializing the editor for that type
   */
  async initialize () {
    // get URL params
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)

    // t corresponds to a `DataType`
    // id is for the id of whatever type is being editted
    const typeNumber = params.t ? Number(params.t) : null
    const id = Number(params.id)
    const typeInfo = types[typeNumber]
    const { isStatic, type } = typeInfo
    Object.assign(this, { isStatic })
    let row
    let data
    if (isStatic) {
      row = await postAndGetJSON('api/get-static', { type })
      data = row.data
    } else {
      if (id) {
        row = await postAndGetJSON('api/get', { type, id })
        data = row.data
      } else {
        data = await postAndGetJSON('api/default', { type })
        row = { data }
      }
    }
    console.log(deepcopy(row))
    const editor = new typeInfo.Editor(data, this.editor)
    editor.build()
    editor.input()
    editor.setup()

    this.renderSubmitButton()
    this.setupSubmitButton(editor, row, typeInfo.type)
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

const page = new Page()
page.initialize()
