import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

class MediaModel extends EditorModel {
  constructor (mediaId) { 
    super(mediaId)
    this.type = 'media'
  }

  // getMedia = async () => await this.getData('media', { name: '' })
}

class MediaView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the media creator
   */
  buildEditor (media) {
    if (media) {
      const { name } = media
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      this.editor.innerHTML = 'NO MEDIA FOUND'
    }
  }
}

class MediaController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }


  getUserData () {
    return { mediaId: this.model.id, name: this.view.nameInput.value }
  }

  async initializeEditor (parent) {
    await this.initializeBase(media => {
      this.view.buildEditor(media)
      this.view.renderEditor(parent)
      this.setupSubmitButton()
    })
  }
}

export class Media extends EditorType {
  constructor (mediaId) {
    super()
    const model = new MediaModel(mediaId)
    const view = new MediaView()
    this.controller = new MediaController(model, view)
  }
}
