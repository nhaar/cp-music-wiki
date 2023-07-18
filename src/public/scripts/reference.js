import { EditorController, EditorModel, EditorType, EditorView } from './editor-class.js'
import { createElement } from './utils.js'

/**
 * @typedef {object} ReferenceData
 * @property {string} referenceId
 * @property {string} name
 * @property {string} link
 * @property {string} description
 */

class ReferenceModel extends EditorModel {
  constructor () { super('reference') }
}

class ReferenceView extends EditorView {
  /**
   * Reference buildEditor
   * @param {ReferenceData} reference
   */
  buildEditor (reference) {
    if (reference) {
      const { name, description, link } = reference
      this.nameInput = createElement({ parent: this.editor, tag: 'input', value: name })
      this.linkInput = createElement({ parent: this.editor, tag: 'input', value: link })
      this.descriptionArea = createElement({ parent: this.editor, tag: 'textarea', value: description })
    } else {
      this.editor.innerHTML = 'NO REFERENCE FOUND'
    }
  }
}

class ReferenceController extends EditorController {
  /**
   * Reference getUserData
   * @returns {ReferenceData}
   */
  getUserData () {
    const name = this.view.nameInput.value
    const link = this.view.linkInput.value
    const description = this.view.descriptionArea.value

    return { referenceId: this.model.id, name, link, description }
  }
}

export class Reference extends EditorType {
  constructor (id) { super(id, ReferenceModel, ReferenceView, ReferenceController) }
}
