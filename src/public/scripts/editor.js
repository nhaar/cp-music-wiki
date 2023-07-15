import { selectElement, createElement } from './utils.js'
import { DatabaseModel } from './database-model.js'
import { Song } from './song.js'
import { EditorController, EditorView } from './editor-class.js'

/**
 * Object containing information from a row in a table
 * @typedef {object} Row
 */

/**
 * Data structure for a song
 * @typedef {object} Song
 * @property {string} songId
 * @property {string[]} names
 * @property {string[]} authors
 * @property {Files} files
 * @property {Medias}
 */

/**
 * Each property is a file id and it maps to a boolean representing whether or not
 * it is a high quality source
 * @typedef {object} Files
 */

/**
 * Each property is a media id and it maps to a Features object
 * @typedef {object} Medias
 */

/**
 * Each property is a feature id and it maps to a Feature object
 * @typedef {object} Features
 */

/**
 * Details for a feature data
 * @typedef {object} Feature
 * @property {boolean} releaseDate
 * @property {string} date
 * @property {boolean} isEstimate
 */

/**
 * Object containing name for element classes
 * @typedef {object} Elements
 */

/**
 * @typedef {object} RowData
 * @property {string} value
 * @property {object} dataset
 */

class Model extends DatabaseModel {
  constructor () {
    super()
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)
    const type = params.t
    const id = params.id

    Object.assign(this, { type, id })
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

  async getAuthor () {
    const data = await this.getFromDatabase('api/get-author')
    return data
  }

  async getCollection () {
    const data = await this.getFromDatabase('api/get-collection')
    return data
  }
}

class View extends EditorView {
  constructor () {
    super()
    this.editor = selectElement('js-editor')
  }

  /**
   * Renders the author editor for an author
   * @param {Row} author
   */
  renderAuthorEditor (author) {
    if (author) {
      const { name } = author
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      this.editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }

  /**
   * Renders the collection editor for a collection
   * @param {Row} collection
   */
  renderCollectionEditor (collection) {
    const { editor } = this
    if (collection) {
      const { name } = collection
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }
}

class Controller extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  async initializePage () {
    switch (this.model.type) {
      case '0': {
        const song = new Song(this.model.id)
        song.initializeEditor(this.view.editor)
        break
      }
      case '1': {
        const author = await this.model.getAuthor()
        this.view.renderAuthorEditor(author)
        this.setupSubmitAuthor()
        break
      }
      case '2': {
        const collection = await this.model.getCollection()
        this.view.renderCollectionEditor(collection)
        this.setupSubmitCollection()
        break
      }
      default: {
        this.view.editor.innerHTML = 'ERROR'
        break
      }
    }
  }

  /**
   * Sets up the submit button for the author editor
   */
  setupSubmitAuthor () {
    this.setupSubmitButton('api/submit-author', () => this.getAuthorData())
  }

  /**
   * Sets up the submit button for the collection editor
   */
  setupSubmitCollection () {
    this.setupSubmitButton('api/submit-collection', () => this.getCollectionData())
  }

  /**
   * Gets the user inputed author data to send to the database
   * @returns {Row}
   */
  getAuthorData () {
    return { authorId: this.model.id, name: this.view.nameInput.value }
  }

  /**
   * Gets the user inputed collection data to send to the database
   * @returns {Row}
   */
  getCollectionData () {
    return { collectionId: this.model.id, name: this.view.nameInput.value }
  }
}

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.initializePage()
