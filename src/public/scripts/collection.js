import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

class CollectionModel extends EditorModel {
  constructor (authorId) {
    super()
    this.id = authorId
  }

  getCollection = async () => await this.getData('collection', { name: '' })
}

class CollectionView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the collection editor for a collection
   * @param {Row} collection
   */
  buildEditor (collection) {
    if (collection) {
      const { name } = collection
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      this.editor.innerHTML = 'NO COLLECTION FOUND'
    }
  }
}

class CollectionController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  async initializeEditor (parent) {
    const collection = await this.model.getCollection()
    this.view.buildEditor(collection)
    this.view.renderEditor(parent)
    this.setupSubmitCollection()
  }

  /**
   * Sets up the submit button for the collection editor
   */
  setupSubmitCollection () {
    this.setupSubmitButton('collection', () => this.getCollectionData())
  }

  /**
   * Gets the user inputed collection data to send to the database
   * @returns {Row}
   */
  getCollectionData () {
    return { collectionId: this.model.id, name: this.view.nameInput.value }
  }
}

export class Collection extends EditorType {
  constructor (collectionId) {
    super()

    const model = new CollectionModel(collectionId)
    const view = new CollectionView()
    this.controller = new CollectionController(model, view)
  }
}
