import { EditorModel } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { selectElement, getTakenVariable, createElement } from './utils.js'

class Model extends EditorModel {
  constructor () { super('') }
}

class View {
  constructor () {
    this.select = selectElement('type-select')
    this.input = selectElement('id-input')
    this.edit = selectElement('edit-button')
    this.create = selectElement('create-button')
  }
}

class Controller {
  constructor (model, view) {
    Object.assign(this, { model, view })
  }

  /**
   * Gives control to the page
   */
  setupPage () {
    this.view.select.addEventListener('change', () => {
      this.model.type = this.view.select.value
      let databaseVar
      let databaseValue
      let fetchDataFunction
      switch (this.model.type) {
        case '0': {
          databaseVar = 'song_id'
          databaseValue = 'name_text'
          fetchDataFunction = a => this.model.getSongNames(a)
          break
        }
        case '1' : {
          databaseVar = 'author_id'
          databaseValue = 'name'
          fetchDataFunction = a => this.model.getAuthorNames(a)
          break
        }
        case '2': {
          databaseVar = 'source_id'
          databaseValue = 'name'
          fetchDataFunction = a => this.model.getSourceNames(a)
          break
        }
        case '3': {
          databaseVar = 'file_id'
          databaseValue = 'original_name'
          fetchDataFunction = a => this.model.getFileNames(a)
          break
        }
        case '4': {
          databaseVar = 'media_id'
          databaseValue = 'name'
          fetchDataFunction = a => this.model.getMediaNames(a)
          break
        }
        case '5': {
          databaseVar = 'feature_id'
          databaseValue = 'name'
          fetchDataFunction = a => this.model.getFeatureNames(a)
          break
        }
        case '6': {
          databaseVar = 'reference_id'
          databaseValue = 'name'
          fetchDataFunction = a => this.model.getReferenceNames(a)
        }
        case '7': {
          databaseVar = 'room_id'
          databaseValue = 'name'
          fetchDataFunction = a => this.model.getRoomNames(a)
        }
      }

      // reset query
      this.view.input.innerHTML = ''
      const input = createElement({ parent: this.view.input, tag: 'input' })

      createSearchQuery(
        input,
        'id',
        databaseVar,
        databaseValue,
        fetchDataFunction,
        () => getTakenVariable(input, databaseVar)
      )
    })

    // to create a new entry
    this.view.create.addEventListener('click', () => {
      if (this.model.type) window.location.href = this.getEditorParam()
    })

    // edit existing entry
    this.view.edit.addEventListener('click', () => {
      const input = this.view.input.querySelector('input')
      if (this.model.type && input.dataset.id) window.location.href = this.getIdParam(input.dataset.id)
    })
  }

  /**
   * Get the path to the editor for a given type
   * @returns {string}
   */
  getEditorParam () {
    return `editor?t=${this.model.type}`
  }

  /**
   * Get the path to the editor for a given type and id
   * @param {string} id
   * @returns {string}
   */
  getIdParam (id) {
    return this.getEditorParam() + `&id=${id}`
  }
}

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.setupPage()
