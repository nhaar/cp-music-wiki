import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

/**
 * @typedef {object} SourceData
 * @property {number} sourceId
 * @property {string} name
 */

class SourceModel extends EditorModel {
  constructor () {
    super('source')
  }
}

class SourceView extends EditorView {
  /**
   * Source buildEditor
   * @param {Row} source Database row
   */
  buildEditor (source) {
    if (source) {
      const { name } = source
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
    } else {
      this.editor.innerHTML = 'NO SOURCE FOUND'
    }
  }
}

class SourceController extends EditorController {
  /**
   * Gets the user inputed source data to send to the database
   * @returns {SourceData}
   */
  getUserData () {
    return { name: this.view.nameInput.value }
  }
}

export class Source extends EditorType {
  constructor (id) { super(id, SourceModel, SourceView, SourceController) }
}
