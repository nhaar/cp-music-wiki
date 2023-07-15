import { selectElement } from './utils.js'
import { EditorModel, EditorController, EditorView } from './editor-class.js'
import { Song } from './song.js'
import { Author } from './author.js'
import { Collection } from './collection.js'

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

class Model extends EditorModel {
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
}

class View extends EditorView {
  constructor () {
    super()
    this.editor = selectElement('js-editor')
  }
}

class Controller extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  async initializePage () {
    const typeRelation = {
      0: Song,
      1: Author,
      2: Collection
    }

    for (const t in typeRelation) {
      if (t === this.model.type) {
        const type = new typeRelation[t](this.model.id)
        type.initializeEditor(this.view.editor)
        return
      }
    }
    this.view.editor.innerHTML = 'ERROR'

    // // switch (this.model.type) {
    // //   case '0': {
    // //     const song = new Song(this.model.id)
    // //     song.initializeEditor(this.view.editor)
    // //     break
    // //   }
    // //   case '1': {
    // //     const author = new Author(this.model.id)
    // //     author.initializeEditor(this.view.editor)
    // //     break
    // //   }
    // //   case '2': {
    // //     const collection = new Collection(this.model.id)
    // //     collection.initializeEditor(this.view.editor)
    // //     break
    // //   }
    // //   default: {
    // //     this.view.editor.innerHTML = 'ERROR'
    // //     break
    // //   }
    // }
  }
}

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.initializePage()
