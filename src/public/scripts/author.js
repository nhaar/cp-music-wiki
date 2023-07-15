import { DatabaseModel } from './database-model.js'
import { EditorController, EditorView } from './editor-class.js'
import { createElement } from './utils.js'

class AuthorModel extends DatabaseModel {
  constructor (authorId) {
    super()
    this.id = authorId
  }

  async getAuthor () {
    const data = await this.getFromDatabase('api/get-author')
    return data
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
    const author = await this.model.getAuthor()
    this.view.buildEditor(author)
    this.view.renderEditor(parent)
    this.setupSubmitAuthor()
  }

  /**
   * Sets up the submit button for the author editor
   */
  setupSubmitAuthor () {
    this.setupSubmitButton('api/submit-author', () => this.getAuthorData())
  }

  /**
   * Gets the user inputed author data to send to the database
   * @returns {Row}
   */
  getAuthorData () {
    return { authorId: this.model.id, name: this.view.nameInput.value }
  }
}

export class Author {
  constructor (authorId) {
    const model = new AuthorModel(authorId)
    const view = new AuthorView()
    this.controller = new AuthorController(model, view)
  }

  initializeEditor = async parent => await this.controller.initializeEditor(parent)
}
