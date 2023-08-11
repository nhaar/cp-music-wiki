import { createSearchQuery } from './query-options.js'
import { selectElement, createElement, styleElement, postAndGetJSON } from './utils.js'

class View {
  /** Create page elements */
  constructor () {
    this.select = selectElement('type-select')
    const defaultOption = createElement({ parent: this.select, tag: 'option', value: '-1', innerHTML: '[CHOOSE WHAT TO EDIT]' })
    defaultOption.setAttribute('selected', '')
    preeditorData.forEach((info, i) => {
      createElement({ parent: this.select, tag: 'option', value: i + '', innerHTML: info.name })
    })
    this.select.removeChild(this.select.children[0])

    this.bottom = selectElement('input-row')
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
    this.view.select.addEventListener('change', () => {
      const value = this.view.select.value
      if (value !== '-1') {
        this.view.bottom.classList.remove('hidden')
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

          console.log(cls)
          createSearchQuery(
            input,
            cls
          )
        }
      } else {
        this.view.input.innerHTML = ' '
        this.view.bottom.classList.add('hidden')
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
        if (isInt) window.location.href = this.getIdParam('0')
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

let preeditorData

postAndGetJSON('api/get-preeditor-data', {}).then(res => {
  preeditorData = res
  console.log(preeditorData)

  const view = new View()
  const controller = new Controller(view)
  controller.setupPage()
})
