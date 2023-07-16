import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

class AuthorModel extends EditorModel {
  constructor (authorId) { 
    super(authorId)
    this.type = 'author'
  }
}

class AuthorView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the author editor for an author
   * @param {Row} author
   */
  buildEditor (author) {
    if (author) {
      const { name } = author
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      this.editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }
}

class AuthorController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  async initializeEditor (parent) {
    await this.initializeBase(author => {
      this.view.buildEditor(author)
      this.view.renderEditor(parent)
      this.setupSubmitButton()    
    })
    }

  /**
   * Gets the user inputed author data to send to the database
   * @returns {Row}
   */
  getUserData () {
    return { authorId: this.model.id, name: this.view.nameInput.value }
  }
}

export class Author extends EditorType {
  constructor (authorId) {
    super()

    const model = new AuthorModel(authorId)
    const view = new AuthorView()
    this.controller = new AuthorController(model, view)
  }
}
