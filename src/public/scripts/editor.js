import { createElement, postAndGetJSON, postJSON, selectElement } from './utils.js'
import { types } from './type-info.js'

class View {
  constructor () {
    this.editor = selectElement('js-editor')
  }

  /**
   * Renders the button for submitting the data at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }
}

class Controller {
  /**
   * @param {View} view
   */
  constructor (view) { this.view = view }

  /**
   * Add controls to the submit button
   */
  setupSubmitButton (editorModule, response, type) {
    this.view.submitButton.addEventListener('click', () => {
      editorModule.output()
      postJSON('api/update', { type, update: response })
      console.log(response)
    })
    // this.submitBlocker.button = this.view.submitButton
    // this.submitBlocker.clickCallback = () => {
    //   const data = this.getUserData()
    //   this.model.update(data)
    // }
    // this.submitBlocker.addListeners()
  }

  /**
   * Initializes the editor by handling the options from the URL
   * and initializing the editor for that type
   */
  async initializePage () {
    // get URL params
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)

    // t corresponds to the type, guide is below
    // id is for the id of whatever type is being editted
    const type = params.t ? Number(params.t) : null
    const id = Number(params.id)
    const typeInfo = types[type]
    console.log(type)
    const response = await postAndGetJSON('api/get', { type: typeInfo.type, id, request: typeInfo.input })
    const EditorClass = typeInfo.editor 
    console.log(EditorClass)
    const editor = new EditorClass(this.view.editor, response)
    editor.build()
    editor.input()
    editor.setup()
    // make a request including type, id, request type

    this.view.renderSubmitButton()
    this.setupSubmitButton(editor, response, typeInfo.type)

    // const typeRelation = {
    //   0: Song,
    //   1: Author,
    //   2: Source,
    //   3: File,
    //   4: Reference,
    //   5: FlashRoom
    // }

    // const Class = typeRelation[type]
    // if (Class) {
    //   const type = new Class(id)
    //   type.initializeEditor(this.view.editor)
    // } else this.view.editor.innerHTML = 'ERROR'
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

const view = new View()
const controller = new Controller(view)
controller.initializePage()
