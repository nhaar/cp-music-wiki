import { createElement, postAndGetJSON, postJSON, selectElement } from './utils.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'

class Model {
  /**
   * Gets the taken data for the song name
   * @param {HTMLInputElement} input - The song name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenSong (input) {
    return this.getTakenVariable(input, 'songId')
  }

  /**
   * Gets the taken data for the collection
   * @param {HTMLInputElement} input - The collection name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenCollection (input) {
    return this.getTakenVariable(input, 'collectionId')
  }

  /**
   * Gets all songs based on a keyword
   * @param {string} keyword
   * @returns {import('./editor.js').Row[]}
   */
  async getSongNames (keyword) {
    const rows = await postAndGetJSON('api/get-main-names', { keyword })
    return rows
  }

  /**
   * Gets all collections based on a keyword
   * @param {string} keyword
   * @returns {import('./editor.js').Row[]}
   */
  async getCollectionNames (keyword) {
    const rows = await postAndGetJSON('api/get-collection-names', { keyword })
    return rows
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
}

class View {
  constructor () {
    this.typeSelect = selectElement('js-select-type')
    this.createSection = selectElement('js-create-section')
  }

  /**
   * Add an option to the type select
   * @param {string} type - Name to use
   */
  addOption (type) {
    createElement({ parent: this.typeSelect, tag: 'option', value: type, innerHTML: type })
  }

  /**
   * Renders the song creator
   */
  renderSongCreate () {
    this.songName = createElement({ parent: this.createSection, tag: 'input' })
    this.createButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Create song' })
  }

  /**
   * Renders the author creator
   */
  renderAuthorCreate () {
    this.authorName = createElement({ parent: this.createSection, tag: 'input' })
    this.authorButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Add author' })
  }

  /**
   * Renders the collection creator
   */
  renderCollectionCreate () {
    this.collectionName = createElement({ parent: this.createSection, tag: 'input' })
    this.collectionButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Add collection' })
  }

  /**
   * Renders the file creator
   */
  renderFileCreate () {
    this.songInput = createElement({ parent: this.createSection, tag: 'input' })
    this.collectionInput = createElement({ parent: this.createSection, tag: 'input' })
    this.fileInput = createElement({ parent: this.createSection, tag: 'input' })
    this.uploadButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Upload file' })
  }
}

class Controller {
  constructor (model, view) {
    Object.assign(this, { model, view })

    this.types = {
      Song: () => {
        view.renderSongCreate()
        this.setupSongCreator()
      },
      Author: () => {
        view.renderAuthorCreate()
        this.setupAuthorCreator()
      },
      Collection: () => {
        view.renderCollectionCreate()
        this.setupCollectionCreator()
      },
      File: () => {
        view.renderFileCreate()
        this.setupFileCreator()
      }
    }
  }

  /**
   * Start the creator page
   */
  initializePage () {
    let isFirstOne = true
    for (const type in this.types) {
      if (isFirstOne) {
        isFirstOne = false
        this.types[type]()
      }
      this.view.addOption(type)
    }

    this.view.typeSelect.addEventListener('change', () => {
      this.types[this.view.typeSelect.value]()
    })
  }

  /**
   * Give controls to the song creator
   */
  setupSongCreator () {
    this.setupNameCreator(this.view.songName, this.view.createButton, 'api/create-song')
  }

  /**
   * Give controls to the author creator
   */
  setupAuthorCreator () {
    this.setupNameCreator(this.view.authorName, this.view.authorButton, 'api/create-author')
  }

  /**
   * Give controls to the collection creator
   */
  setupCollectionCreator () {
    this.setupNameCreator(this.view.collectionName, this.view.collectionButton, 'api/create-collection')
  }

  /**
   * Give controls to the file creator
   */
  setupFileCreator () {
    const songVar = 'songId'
    const collectionVar = 'collectionId'
    const fileVar = 'file'

    const uploadBlocker = new Blocker(this.uploadButton, () => {
      const songId = this.view.songInput.dataset[songVar]
      const collectionId = this.view.collectionInput.dataset[collectionVar]
      const file = this.view.fileInput.files[0]

      const formData = new FormData()
      formData.append('file', file)
      formData.append('songId', songId)
      formData.append('collectionId', collectionId)

      fetch('api/submit-file', {
        method: 'POST',
        body: formData
      })
    })

    const vars = [fileVar, songVar, collectionVar]
    vars.forEach(variable => uploadBlocker.block(variable))
    this.view.fileInput.addEventListener('change', e => {
      if (e.target.files.length === 0) {
        uploadBlocker.block(fileVar)
      } else {
        uploadBlocker.unblock(fileVar)
      }
    })

    createSearchQuery(
      this.view.songInput,
      songVar,
      'song_id',
      'name_text',
      a => this.model.getSongNames(a),
      a => this.model.getTakenSong(a),
      uploadBlocker
    )

    createSearchQuery(
      this.view.collectionInput,
      collectionVar,
      'collection_id',
      'name',
      a => this.model.getCollectionNames(a),
      a => this.model.getTakenCollection(a),
      uploadBlocker
    )
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
      postJSON(route, { name })
    })
  }
}

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.initializePage()
