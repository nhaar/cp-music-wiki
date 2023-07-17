import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

/**
 * @typedef {object} CollectionData
 * @property {string} collectionId
 * @property {string} name
 */

class CollectionModel extends EditorModel {
  constructor () {
    super('collection')
  }
}

class CollectionView extends EditorView {
  constructor () { super(undefined) }

  /**
   * Collection buildEditor
   * @param {Row} collection Database row
   */
  buildEditor (collection) {
    if (collection) {
      const { name } = collection
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
    } else {
      this.editor.innerHTML = 'NO COLLECTION FOUND'
    }
  }
}

class CollectionController extends EditorController {
  /**
   * Gets the user inputed collection data to send to the database
   * @returns {CollectionData}
   */
  getUserData () {
    return { collectionId: this.model.id, name: this.view.nameInput.value }
  }
}

export class Collection extends EditorType {
  constructor (id) { super(id, CollectionModel, CollectionView, CollectionController) }
}
