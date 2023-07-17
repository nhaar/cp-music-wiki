import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

/**
 * @typedef {object} MediaData
 * @property {string} mediaId
 * @property {string} name
 */

class MediaModel extends EditorModel {
  constructor () {
    super('media')
  }
}

class MediaView extends EditorView {
  constructor () { super(undefined) }

  /**
   * Media buildEditor
   * @param {MediaData} media
   */
  buildEditor (media) {
    if (media) {
      const { name } = media
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
    } else {
      this.editor.innerHTML = 'NO MEDIA FOUND'
    }
  }
}

class MediaController extends EditorController {
  /**
   * Media getUserData
   * @returns {MediaData}
   */
  getUserData () {
    return { mediaId: this.model.id, name: this.view.nameInput.value }
  }
}

export class Media extends EditorType {
  constructor (id) { super(id, MediaModel, MediaView, MediaController) }
}
