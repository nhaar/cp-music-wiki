import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createElement } from './utils.js'

class MediaModel extends EditorModel {
  constructor () {
    super(undefined)
  }
}

class MediaView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the media creator
   */
  buildEditor () {
    this.mediaName = createElement({ parent: this.editor, tag: 'input' })
    this.mediaButton = createElement({ parent: this.editor, tag: 'button', innerHTML: 'Add media' })
  }
}

class MediaController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  setupMediaCreator () {
    this.setupNameCreator(this.view.mediaName, this.view.mediaButton, 'api/create-media')
  }

  initializeEditor (parent) {
    this.view.buildEditor()
    this.view.renderEditor(parent)
    this.setupMediaCreator()
  }
}

export class Media extends EditorType {
  constructor () {
    super()
    const model = new MediaModel()
    const view = new MediaView()
    this.controller = new MediaController(model, view)
  }
}
