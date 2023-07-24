import { EditorModel } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { types } from './type-info.js'
import { selectElement, getTakenVariable, createElement } from './utils.js'

class Model extends EditorModel {
  constructor () { super('') }
}

class View {
  constructor () {
    this.select = selectElement('type-select')
    types.forEach((info, i) => {
      createElement({parent: this.select, tag: 'option', value: i + '', innerHTML: info.name})
    })

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
       
      this.model.type = Number(this.view.select.value)
      const { type } = types[this.model.type]
      // reset query
      this.view.input.innerHTML = ''
      const input = createElement({ parent: this.view.input, tag: 'input' })

      createSearchQuery(
        input,
        type
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
