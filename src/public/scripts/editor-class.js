import { Blocker } from './submit-block.js'
import { createElement, postJSON, postAndGetJSON } from './utils.js'

export class EditorModel {
  getByName = async (keyword, table) => postAndGetJSON('api/get-by-name', { keyword, table })
  getSongNames = async keyword => this.getByName(keyword, 'song_names')
  getCollectionNames = async keyword => this.getByName(keyword, 'collections')
  getMediaNames = async keyword => this.getByName(keyword, 'medias')
  getAuthorNames = async keyword => this.getByName(keyword, 'authors')
  getFeatureNames = async keyword => this.getByName(keyword, 'features')

  /**
   * Get an item from the database
   * @param {string} route - Route to get
   */
  async getFromDatabase (type) {
    const { id } = this
    console.log(type, id)
    const response = await postJSON('api/get', { type, id })
    if (response.status === 200) {
      const data = await response.json()
      return data
    } else {
      return null
    }
  }

  createNameOnly (route, name) {
    postJSON(route, { name })
  }

  async getData (type, defaultData) {
    if (this.id) {
      const data = await this.getFromDatabase(type)
      return data
    } else {
      return defaultData
    }
  }

  update (type, data) {
    postJSON('api/update', { type, data })
  }
}

/**
 * Base for the View classes for the editor related objects
 */
export class EditorView {
  /**
   * Renders the editor inside an element
   * @param {HTMLElement} parent
   */
  renderEditor (parent) {
    parent.appendChild(this.editor)
  }

  /**
   * Renders the submit data button at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }
}

/**
 * Base for the Controller classes for the editor related objects
 */
export class EditorController {
  constructor () {
    this.submitBlocker = new Blocker()
  }

  /**
   * Sets up the submit button controls
   * @param {string} route - Route to push the data to
   * @param {function() : object} dataFunction - Function that returns the data to be sent
   */
  setupSubmitButton (type, dataFunction) {
    this.submitBlocker.button = this.view.submitButton
    console.log(this.view.submitButton)
    this.submitBlocker.clickCallback = () => {
      const data = dataFunction()
      this.model.update(type, data)
    }
    this.submitBlocker.addListeners()
  }

  /**
   * Gets the taken data for one of the inputs
   * @param {HTMLInputElement} element - Reference to the input
   * @param {string} variable - Name of data variable
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenVariable (element, variable) {
    const value = element.dataset[variable]
    const hasUntakenId = !value
    const takenIds = [value]
    return { hasUntakenId, takenIds }
  }

  /**
   * Sets up a creator which works only on inputing an arbitrary name
   * @param {HTMLInputElement} inputElement - Element the name is being typed in
   * @param {HTMLButtonElement} buttonElement - Element that is responsible for creating
   * @param {string} route - The specific route that needs to be reached
   */
  setupNameCreator (inputElement, buttonElement, route) {
    buttonElement.addEventListener('click', () => {
      const name = inputElement.value
      this.model.createNameOnly(route, name)
    })
  }
}

export class EditorType {
  initializeEditor = async parent => await this.controller.initializeEditor(parent)
}
