import { selectElement } from './utils.js'
import { EditorModel, EditorController, EditorView } from './editor-class.js'
import { Song } from './song.js'
import { Author } from './author.js'
import { Collection } from './collection.js'
import { File } from './file.js'
import { Media } from './media.js'
import { Feature } from './feature.js'

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
 * Object used for storing data for a moveable row
 * @typedef {object} RowData
 * @property {string} value
 * @property {object} dataset
 */

class View {
  constructor () {
    this.editor = selectElement('js-editor')
  }
}

class Controller {
  constructor (view) { this.view = view }

  async initializePage () {
    // get URL params to choose the type
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)

    // t corresponds to the type, guide is below
    // id is for the id of whatever type is being editted
    const type = params.t
    const id = params.id

    const typeRelation = {
      0: Song,
      1: Author,
      2: Collection,
      3: File,
      4: Media,
      5: Feature
    }

    for (const t in typeRelation) {
      if (t === type) {
        const type = new typeRelation[t](id)
        type.initializeEditor(this.view.editor)
        return
      }
    }
    this.view.editor.innerHTML = 'ERROR'
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
