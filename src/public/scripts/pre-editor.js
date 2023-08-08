import { createSearchQuery } from './query-options.js'
import { types } from './type-info.js'
import { selectElement, createElement, styleElement, postAndGetJSON } from './utils.js'

class View {
  /** Create page elements */
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
  /** Create controller */
  constructor (view) {
    Object.assign(this, { view })
  }

  /** Gives control to the page */
  async setupPage () {
    const preeditorData = await postAndGetJSON('/get-preeditor-data', {})

    this.view.select.addEventListener('change', () => {
      const value = this.view.select.value
      if (value) {
        this.cls = Number(value)
        const { cls, isStatic } = preeditorData[this.cls]
        Object.assign(this, { isStatic })

        if (isStatic) {
          // leave only editor button available
          this.view.input.innerHTML = ''
          styleElement(this.view.create, 'hidden')
        } else {
          // reset query
          this.view.input.innerHTML = ''
          const input = createElement({ parent: this.view.input, tag: 'input' })

          this.view.create.classList.remove('hidden')

          createSearchQuery(
            input,
            cls
          )
        }
      } else {
        this.view.input.innerHTML = ' '
      }
    })

    // to create a new entry
    this.view.create.addEventListener('click', () => {
      if (Number.isInteger(this.cls)) window.location.href = this.getEditorParam()
    })

    // edit existing entry
    this.view.edit.addEventListener('click', () => {
      const isInt = Number.isInteger(this.cls)
      if (this.isStatic) {
        if (isInt) window.location.href = this.getEditorParam()
      } else {
        const input = this.view.input.querySelector('input')
        if (isInt && input.dataset.id) window.location.href = this.getIdParam(input.dataset.id)
      }
    })
  }

  /**
   * Get the path to the editor for a given class
   * @returns {string}
   */
  getEditorParam () {
    return `editor?t=${this.cls}`
  }

  /**
   * Get the path to the editor for a given class and id
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
