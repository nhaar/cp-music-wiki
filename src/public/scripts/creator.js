import { createElement, selectElement } from './utils.js'
import { EditorController, EditorModel } from './editor-class.js'
import { File } from './file.js'
import { Media } from './media.js'
import { Feature } from './feature.js'

class Model extends EditorModel {
  constructor () { super(undefined) }
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

  clearCreator () {
    this.createSection.innerHTML = ''
  }
}

class Controller extends EditorController {
  constructor (model, view) {
    super()
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
        const file = new File()
        file.initializeEditor(this.view.createSection)
      },
      Media: () => {
        const media = new Media()
        media.initializeEditor(this.view.createSection)
      },
      Feature: () => {
        const feature = new Feature()
        feature.initializeEditor(this.view.createSection)
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
      this.view.clearCreator()
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
}

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.initializePage()
