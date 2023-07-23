import { Blocker } from './submit-block.js'
import { createElement, postJSON, postAndGetJSON } from './utils.js'

/**
 * Represents an object that is the object representation of a data structure, eg an object representing a song
 * @typedef ItemData
 */

/**
 * Base class for the model classes for each editor
 *
 * It assumes that the id variable is given by the controller
 *
 * It contains various general functions to handle the database that can be used for all the different models
 */
export class EditorModel {
  /**
   *
   * @param {string} type - A string of the type of the editor (eg song) to specify the data for the database
   * @param {ItemData} defaultData - A base object to be used as the base data structure if creating something (having no id)
   */
  constructor (type, defaultData = {}) {
    this.type = type
    this.defaultData = defaultData
  }

  /**
   * Asynchronously gets the data to be used for the current item
   * @returns {ItemData} The data to use for creating the page
   */
  async getData () {
    if (this.id) {
      this.data = (await this.getFromDatabase()).data
    } else {
      this.data = await this.getDefault()
    }
    return this.data
  }

  /**
   * Submits the data to update the item in the database
   * @param {ItemData} data
   */
  update (data) { postJSON('api/update', { type: this.type, info: { id: Number(this.id), data } }) }

  /**
   * Asynchronously gets the data for the current item if editting
   * @returns {ItemData | null} The data object if exists, null if an error occurs
   */
  async getFromDatabase () {
    const response = await postJSON('api/get', { type: this.type, id: this.id })
    if (response.status === 200) {
      const data = await response.json()
      return data
    } else {
      return null
    }
  }

  async getDefault () {
    const response = await postJSON('api/default', { type: this.type, id: this.id })
    if (response.status === 200) {
      const data = await response.json()
      return data
    } else {
      return null
    }
  }

  /**
   * Helper function to asynchronously get the name of a row in a table with its id
   * @param {string} table
   * @param {string} id
   * @returns {string} The name, or empty string if no id found
   */
  async getNameFromId (table, id) {
    if (!id) return ''
    else {
      const response = await postAndGetJSON('api/get-name', { table, id })
      return response.name
    }
  }

  // functions that filter tables by a keyword
  getByName = async (keyword, table) => postAndGetJSON('api/get-by-name', { keyword, table })
  getSongNames = async keyword => this.getByName(keyword, 'song_names')
  getSourceNames = async keyword => this.getByName(keyword, 'sources')
  getMediaNames = async keyword => this.getByName(keyword, 'medias')
  getAuthorNames = async keyword => this.getByName(keyword, 'authors')
  getFeatureNames = async keyword => this.getByName(keyword, 'features')
  getFileNames = async keyword => this.getByName(keyword, 'files')
  getReferenceNames = async keyword => this.getByName(keyword, 'wiki_references')
  getFeatureInMedias = async (keyword, mediaId) => postAndGetJSON('api/get-in-media', { keyword, mediaId })
  getRoomNames = async keyword => this.getByName(keyword, 'flash_rooms')
}

/**
 * Base for the view classes for each editor
 *
 * It is expected that the inheriting View class will have a "buildEditor" function
 * that updates the editor variable reference to have the appropriate views and takes only one argument
 */
export class EditorView {
  /**
   *
   * @param {string} className - CSS class to use for the editor element
   */
  constructor (className) {
    this.editor = createElement({ className })
  }

  /**
   * Renders the editor inside an element
   * @param {HTMLElement} parent
   */
  renderEditor (parent) {
    parent.appendChild(this.editor)
  }

  /**
   * Renders the button for submitting the data at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }
}

/**
 * Base for controller classes for each editor
 *
 * It is expected that the inheriting classes will have the following methods:
 * * "getUserData" which collects data from the page and gives an ItemData representing it
 * * "getBuildData" which gets the argument for the view's buildEditor function, unless the default method is to be used
 * * "setupEditor" which gives control to the editor specific elements, unless there is no controls to give
 */
export class EditorController {
  /**
   * @param {EditorModel} model
   * @param {EditorView} view
   */
  constructor (model, view) {
    this.submitBlocker = new Blocker()
    Object.assign(this, { model, view })
  }

  /**
   * Asynchronously initializes the editor (render and add controls) within an element
   * @param {HTMLElement} parent
   */
  async initializeEditor (parent) {
    await this.model.getData()
    const buildData = await this.getBuildData()

    this.view.buildEditor(buildData)
    this.view.renderEditor(parent)
    this.view.renderSubmitButton()

    this.setupSubmitButton()
    this.setupEditor()
  }

  /**
   * Add controls to the submit button
   */
  setupSubmitButton () {
    this.submitBlocker.button = this.view.submitButton
    this.submitBlocker.clickCallback = () => {
      const data = this.getUserData()
      this.model.update(data)
    }
    this.submitBlocker.addListeners()
  }

  /**
   * Default method
   * @returns {ItemData}
   */
  getBuildData () { return this.model.data }

  /**
   * Default method
   * @returns {undefined}
   */
  setupEditor () { return undefined }
}

/**
 * Base class for the editor types
 */
export class EditorType {
  /**
   * Initialize the editor given the appropriate model, view and controller, as well as the id of the item to be editted/nothing if creating
   * @param {string | undefined} id
   * @param {EditorModel} ModelClass
   * @param {EditorView} ViewClass
   * @param {EditorController} ControllerClass
   */
  constructor (id, ModelClass, ViewClass, ControllerClass) {
    this.model = new ModelClass()
    this.model.id = id
    this.view = new ViewClass()
    this.controller = new ControllerClass(this.model, this.view)
  }

  initializeEditor = async parent => await this.controller.initializeEditor(parent)
}
