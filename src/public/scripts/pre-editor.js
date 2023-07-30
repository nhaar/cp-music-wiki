import { createSearchQuery } from './query-options.js'
import { types } from './type-info.js'
import { selectElement, createElement } from './utils.js'

class View {
  constructor () {
    this.select = selectElement('type-select')
    types.forEach((info, i) => {
      createElement({ parent: this.select, tag: 'option', value: i + '', innerHTML: info.name })
    })

    this.input = selectElement('id-input')
    this.edit = selectElement('edit-button')
    this.create = selectElement('create-button')
  }
}

class Controller {
  constructor (view) {
    Object.assign(this, { view })
  }

  /**
   * Gives control to the page
   */
  setupPage () {
    this.view.select.addEventListener('change', () => {
      const value = this.view.select.value
      if (value) {
        this.type = Number(value)
        const { type } = types[this.type]
        // reset query
        this.view.input.innerHTML = ''
        const input = createElement({ parent: this.view.input, tag: 'input' })

        createSearchQuery(
          input,
          type
        )
      } else {
        this.view.input.innerHTML = ' '
      }
    })

    // to create a new entry
    this.view.create.addEventListener('click', () => {
      if (Number.isInteger(this.type)) window.location.href = this.getEditorParam()
    })

    // edit existing entry
    this.view.edit.addEventListener('click', () => {
      const input = this.view.input.querySelector('input')
      if (Number.isInteger(this.type) && input.dataset.id) window.location.href = this.getIdParam(input.dataset.id)
    })
  }

  /**
   * Get the path to the editor for a given type
   * @returns {string}
   */
  getEditorParam () {
    return `editor?t=${this.type}`
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

const view = new View()
const controller = new Controller(view)
controller.setupPage()
