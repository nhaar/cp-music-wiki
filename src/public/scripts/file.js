import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'
import { createElement } from './utils.js'

class FileModel extends EditorModel {
  constructor () {
    super(undefined)
  }

  createFile (songId, collectionId, file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('songId', songId)
    formData.append('collectionId', collectionId)

    fetch('api/submit-file', {
      method: 'POST',
      body: formData
    })
  }
}

class FileView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the file creator
   */
  buildEditor () {
    this.songInput = createElement({ parent: this.editor, tag: 'input' })
    this.collectionInput = createElement({ parent: this.editor, tag: 'input' })
    this.fileInput = createElement({ parent: this.editor, tag: 'input', type: 'file' })
    this.uploadButton = createElement({ parent: this.editor, tag: 'button', innerHTML: 'Upload file' })
  }
}

class FileController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  initializeEditor (parent) {
    this.view.buildEditor()
    this.view.renderEditor(parent)
    this.setupFileCreator()
  }

  /**
   * Give controls to the file creator
   */
  setupFileCreator () {
    const songVar = 'songId'
    const collectionVar = 'collectionId'
    const fileVar = 'file'

    const uploadBlocker = new Blocker(this.view.uploadButton, () => {
      const songId = this.view.songInput.dataset[songVar]
      const collectionId = this.view.collectionInput.dataset[collectionVar]
      const file = this.view.fileInput.files[0]

      this.model.createFile(songId, collectionId, file)
    })

    uploadBlocker.blockVarElements([fileVar, songVar, collectionVar], [this.view.fileInput, this.view.songInput, this.view.collectionInput])

    this.view.fileInput.addEventListener('change', e => {
      uploadBlocker.ternaryBlock(
        e.target.files.length === 0,
        fileVar, this.view.fileInput
      )
    })

    createSearchQuery(
      this.view.songInput,
      songVar,
      'song_id',
      'name_text',
      a => this.model.getSongNames(a),
      a => this.getTakenSong(a),
      uploadBlocker
    )

    createSearchQuery(
      this.view.collectionInput,
      collectionVar,
      'collection_id',
      'name',
      a => this.model.getCollectionNames(a),
      a => this.getTakenCollection(a),
      uploadBlocker
    )
  }

  /**
   * Gets the taken data for the song name
   * @param {HTMLInputElement} input - The song name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenSong (input) {
    return this.getTakenVariable(input, 'songId')
  }

  /**
   * Gets the taken data for the collection
   * @param {HTMLInputElement} input - The collection name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenCollection (input) {
    return this.getTakenVariable(input, 'collectionId')
  }
}

export class File extends EditorType {
  constructor () {
    super()
    const model = new FileModel()
    const view = new FileView()
    this.controller = new FileController(model, view)
  }
}
