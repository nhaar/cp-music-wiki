import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

/**
 * @typedef {object} AuthorData
 * @property {string} authorId
 * @property {string} name
 */

class AuthorModel extends EditorModel {
  constructor () {
    super('author')
  }
}

class AuthorView extends EditorView {
  constructor () { super(undefined) }

  /**
   * Author buildEditor
   * @param {Row} author - Database row
   */
  buildEditor (author) {
    if (author) {
      const { name } = author
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
    } else {
      this.editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }
}

class AuthorController extends EditorController {
  /**
   * Author getUserData
   * @returns {AuthorData}
   */
  getUserData () {
    return { authorId: this.model.id, name: this.view.nameInput.value }
  }
}

export class Author extends EditorType {
  constructor (id) { super(id, AuthorModel, AuthorView, AuthorController) }
}
