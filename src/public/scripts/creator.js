import { createElement, postJSON, selectElement } from './utils.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'
import { EditorModel } from './editor-class.js'

class Model extends EditorModel {
  constructor () { super(undefined) }
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
   * Gets the taken media for the feature
   * @param {HTMLInputElement} input - Media name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenMedia (input) {
    return this.getTakenVariable(input, 'mediaId')
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

  createNameOnly (route, name) {
    postJSON(route, { name })
  }

  createFile (songId, collectionId, file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('songId', songId)
    formData.append('collectionId', collectionId)

    fetch('api/submit-file', {
      method: 'POST',
      body: formData
    })
  }

  /**
   * Submits a create feature request based on an object containing the data needed to create it
   * @param {object} data
   */
  createFeature (data) {
    postJSON('api/submit-feature', data)
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
    this.clearCreator()
    this.songName = createElement({ parent: this.createSection, tag: 'input' })
    this.createButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Create song' })
  }

  /**
   * Renders the author creator
   */
  renderAuthorCreate () {
    this.clearCreator()
    this.authorName = createElement({ parent: this.createSection, tag: 'input' })
    this.authorButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Add author' })
  }

  /**
   * Renders the collection creator
   */
  renderCollectionCreate () {
    this.clearCreator()
    this.collectionName = createElement({ parent: this.createSection, tag: 'input' })
    this.collectionButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Add collection' })
  }

  /**
   * Renders the file creator
   */
  renderFileCreate () {
    this.clearCreator()
    this.songInput = createElement({ parent: this.createSection, tag: 'input' })
    this.collectionInput = createElement({ parent: this.createSection, tag: 'input' })
    this.fileInput = createElement({ parent: this.createSection, tag: 'input', type: 'file' })
    this.uploadButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Upload file' })
  }

  /**
   * Renders the media creator
   */
  renderMediaCreator () {
    this.clearCreator()
    this.mediaName = createElement({ parent: this.createSection, tag: 'input' })
    this.mediaButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Add media' })
  }

  /**
   * Renders the feature creator
   */
  renderFeatureCreator () {
    this.clearCreator()
    this.featureName = createElement({ parent: this.createSection, tag: 'input' })
    this.featureMedia = createElement({ parent: this.createSection, tag: 'input' })
    this.featureDate = createElement({ parent: this.createSection, tag: 'input', type: 'date' })
    this.featureCheck = createElement({ parent: this.createSection, tag: 'input', type: 'checkbox' })
    this.featureButton = createElement({ parent: this.createSection, tag: 'button', innerHTML: 'Add feature' })
  }

  clearCreator () {
    this.createSection.innerHTML = ''
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
      },
      Media: () => {
        view.renderMediaCreator()
        this.setupMediaCreator()
      },
      Feature: () => {
        view.renderFeatureCreator()
        this.setupFeatureCreator()
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

    const uploadBlocker = new Blocker(this.view.uploadButton, () => {
      const songId = this.view.songInput.dataset[songVar]
      const collectionId = this.view.collectionInput.dataset[collectionVar]
      const file = this.view.fileInput.files[0]

      this.model.createFile(songId, collectionId, file)
    })

    uploadBlocker.blockVarElements([fileVar, songVar, collectionVar], [this.view.fileInput, this.view.songInput, this.view.collectionInput])

    this.view.fileInput.addEventListener('change', e => {
      uploadBlocker.ternaryBlock(
        e.target.files.length === 0,
        fileVar, this.view.fileInput
      )
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

  setupMediaCreator () {
    this.setupNameCreator(this.view.mediaName, this.view.mediaButton, 'api/create-media')
  }

  /**
   * Add controls to the feature creator
   */
  setupFeatureCreator () {
    const mediaVar = 'mediaId'
    const nameVar = 'name'
    const dateVar = 'date'

    const mediaBlocker = new Blocker(this.view.featureButton, () => {
      const name = this.view.featureName.value
      const mediaId = this.view.featureMedia.dataset[mediaVar]
      const date = this.view.featureDate.value
      const isEstimate = this.view.featureCheck.checked

      this.model.createFeature({ name, mediaId, date, isEstimate })
    })

    mediaBlocker.blockVarElements([mediaVar, nameVar, dateVar], [this.view.featureMedia, this.view.featureName, this.view.featureDate])

    setupMustHaveInput(this.view.featureName, mediaBlocker, nameVar)

    createSearchQuery(
      this.view.featureMedia,
      mediaVar,
      'media_id',
      'name',
      a => this.model.getMediaNames(a),
      a => this.model.getTakenMedia(a),
      mediaBlocker
    )

    setupMustHaveInput(this.view.featureDate, mediaBlocker, dateVar)
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

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.initializePage()

/**
 * Makes it so that an input always blocks if there is no data in the input
 * and unblocks whenever data is inputed
 * @param {HTMLInputElement} input
 * @param {Blocker} blocker
 * @param {string} blockVar
 */
function setupMustHaveInput (input, blocker, blockVar) {
  input.addEventListener('input', () => {
    blocker.ternaryBlock(
      input.value === '',
      blockVar, input
    )
  })
}
