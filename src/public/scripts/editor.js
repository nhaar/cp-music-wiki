import { createElement, deepcopy, postAndGetJSON, postJSON, selectElement } from './utils.js'
import { constructEditorModule } from './modules/editor-modules.js'

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
      postJSON('api/update', { type, row, isStatic: this.isStatic })
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
    const editorData = await postAndGetJSON('api/editor-data', { t: Number(params.t) })

    const id = Number(params.id)

    // const typeInfo = types[typeNumber]
    const { isStatic, type } = editorData
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
    const Editor = constructEditorModule(editorData)
    const editor = new Editor(data, this.editor)

    editor.build()
    editor.input()
    editor.setup()



    this.renderSubmitButton()
    this.setupSubmitButton(editor, row, type)
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
