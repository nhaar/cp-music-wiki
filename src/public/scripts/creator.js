import { postAndGetJSON, postJSON } from './utils.js'
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
    this.typeSelect = document.querySelector('.js-select-type')
    this.createSection = document.querySelector('.js-create-section')
    this.uploadFileButton = 'upload-file-button'
  }

  /**
   * Add an option to the type select
   * @param {string} type - Name to use
   */
  addOption (type) {
    this.typeSelect.innerHTML += `
      <option value="${type}"> ${type} </option>
    `
  }

  /**
   * Renders the song creator
   */
  renderSongCreate () {
    const songName = 'js-song-name'
    const createButton = 'js-create-button'
    this.createSection.innerHTML = `
      <input class="${songName}" type="text">
      <button class="${createButton}">
        Create song
      </button>  
    `

    this.songName = document.querySelector('.' + songName)
    this.createButton = document.querySelector('.' + createButton)
  }

  /**
   * Renders the author creator
   */
  renderAuthorCreate () {
    const authorName = 'js-author-name'
    const authorButton = 'js-author-button'
    this.createSection.innerHTML = `
      <input class="${authorName}" type="text">
      <button class="${authorButton}">
        Create author page
      </button>
    `

    this.authorName = document.querySelector('.' + authorName)
    this.authorButton = document.querySelector('.' + authorButton)
  }

  /**
   * Renders the collection creator
   */
  renderCollectionCreate () {
    const inputClass = 'collection-name'
    const buttonClass = 'collection-button'
    this.createSection.innerHTML = `
      <input class="${inputClass}" type="text">
      <button class="${buttonClass}">
        Create author page
      </button>
    `

    this.collectionName = document.querySelector('.' + inputClass)
    this.collectionButton = document.querySelector('.' + buttonClass)
  }

  /**
   * Renders the file creator
   */
  renderFileCreate () {
    const songInputClass = 'file-song-name'
    const collectionInputClass = 'collection-name'
    const fileClass = 'file-upload'

    this.createSection.innerHTML = `
      <input class="${songInputClass}" type="text">
      <input class="${collectionInputClass}" type="text">
      <input class="${fileClass}" type="file">
      <button class="${this.uploadFileButton}">
        Upload file
      </button>
    `

    const fileInput = document.querySelector('.' + fileClass)
    const uploadButton = document.querySelector('.' + this.uploadFileButton)
    const songInput = document.querySelector('.' + songInputClass)
    const collectionInput = document.querySelector('.' + collectionInputClass)
    Object.assign(this, { songInput, collectionInput, fileInput, uploadButton })
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
    const { view, types } = this
    const { typeSelect } = view

    let isFirstOne = true
    for (const type in types) {
      if (isFirstOne) {
        isFirstOne = false
        types[type]()
      }
      view.addOption(type)
    }

    typeSelect.addEventListener('change', () => {
      types[typeSelect.value]()
    })
  }

  /**
   * Give controls to the song creator
   */
  setupSongCreator () {
    const { view } = this
    this.setupNameCreator(view.songName, view.createButton, 'api/create-song')
  }

  /**
   * Give controls to the author creator
   */
  setupAuthorCreator () {
    const { view } = this
    this.setupNameCreator(view.authorName, view.authorButton, 'api/create-author')
  }

  /**
   * Give controls to the collection creator
   */
  setupCollectionCreator () {
    const { view } = this
    this.setupNameCreator(view.collectionName, view.collectionButton, 'api/create-collection')
  }

  /**
   * Give controls to the file creator
   */
  setupFileCreator () {
    const { view } = this
    const { fileInput, uploadButton, songInput, collectionInput } = view
    const { getSongNames, getTakenSong, getCollectionNames, getTakenCollection } = model

    const songVar = 'songId'
    const collectionVar = 'collectionId'
    const fileVar = 'file'

    const uploadBlocker = new Blocker(uploadButton, () => {
      const songId = songInput.dataset[songVar]
      const collectionId = collectionInput.dataset[collectionVar]
      const file = fileInput.files[0]

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
    fileInput.addEventListener('change', e => {
      if (e.target.files.length === 0) {
        uploadBlocker.block(fileVar)
      } else {
        uploadBlocker.unblock(fileVar)
      }
    })

    createSearchQuery(
      songInput,
      songVar,
      'song_id',
      'name_text',
      getSongNames,
      getTakenSong,
      uploadBlocker
    )

    createSearchQuery(
      collectionInput,
      collectionVar,
      'collection_id',
      'name',
      getCollectionNames,
      getTakenCollection,
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
