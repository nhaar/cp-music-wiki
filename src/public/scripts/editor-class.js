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
  async getFromDatabase (route) {
    const { id } = this
    const response = await postJSON(route, { id })
    if (response.status === 200) {
      const data = await response.json()
      return data
    } else {
      return null
    }
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
  setupSubmitButton (route, dataFunction) {
    this.submitBlocker.button = this.view.submitButton
    this.submitBlocker.clickCallback = () => {
      const data = dataFunction()
      postJSON(route, data)
    }
    this.submitBlocker.addListeners()
  }
}

export class EditorType {
  initializeEditor = async parent => await this.controller.initializeEditor(parent)
}
