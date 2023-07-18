import { selectElement } from './utils.js'
import { Song } from './song.js'
import { Author } from './author.js'
import { Collection } from './collection.js'
import { File } from './file.js'
import { Media } from './media.js'
import { Feature } from './feature.js'
import { Reference } from './reference.js'

class View {
  constructor () {
    this.editor = selectElement('js-editor')
  }
}

class Controller {
  /**
   * @param {View} view
   */
  constructor (view) { this.view = view }

  /**
   * Initializes the editor by handling the options from the URL
   * and initializing the editor for that type
   */
  initializePage () {
    // get URL params
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
      5: Feature,
      6: Reference
    }

    const Class = typeRelation[type]
    if (Class) {
      const type = new Class(id)
      type.initializeEditor(this.view.editor)
    } else this.view.editor.innerHTML = 'ERROR'
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
