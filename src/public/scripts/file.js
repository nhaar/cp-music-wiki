import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'
import { createElement } from './utils.js'

class FileModel extends EditorModel {
  constructor (fileId) {
    super()
    this.id = fileId
  }

  createFile (data) {
    const { fileId, songId, collectionId, file, filename, originalname } = data
    const formData = new FormData()
    if (file) {
      formData.append('file', file)
    } else {
      formData.append('filename', filename)
      formData.append('originalname', originalname)
    }
    formData.append('fileId', fileId)
    formData.append('songId', songId)
    formData.append('collectionId', collectionId)

    fetch('api/submit-file', {
      method: 'POST',
      body: formData
    })
  }

  getFile = async () => await this.getData('file', { })
}

class FileView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the file creator
   */
  buildEditor (file, songInfo, collectionInfo) {
    let songName
    let collectionName
    const { songId, collectionId } = file
    songInfo.forEach(row => {
      if (row.song_id === songId) songName = row.name_text
    })

    collectionInfo.forEach(row => {
      if (row.collection_id === collectionId) collectionName = row.name
    })

    this.songInput = createElement({ parent: this.editor, tag: 'input', value: songName, dataset: { songId } })
    this.collectionInput = createElement({ parent: this.editor, tag: 'input', value: collectionName, dataset: { collectionId } })
    this.fileInput = createElement({ parent: this.editor, tag: 'input', type: 'file' })
    this.filePreview = createElement({ parent: this.editor, innerHTML: generateAudio(file) })
    this.renderSubmitButton()
  }
}

class FileController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
  }

  async initializeEditor (parent) {
    const file = await this.model.getFile()
    const songInfo = await this.model.getSongNames('')
    const collectionInfo = await this.model.getCollectionNames('')

    this.view.buildEditor(file, songInfo, collectionInfo)
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

    const uploadBlocker = new Blocker(this.view.submitButton, () => {
      const songId = this.view.songInput.dataset[songVar]
      const collectionId = this.view.collectionInput.dataset[collectionVar]
      const file = this.view.fileInput.files[0]
      let originalname
      let filename

      if (!file) {
        const audioElement = this.view.filePreview.children[0]
        originalname = audioElement.dataset.name
        filename = audioElement.src.match(/\/([^/]+)$/)[1]
      }

      this.model.createFile({ fileId: this.model.id, songId, collectionId, file, originalname, filename })
    })

    if (!this.model.id) {
      uploadBlocker.blockVarElements([fileVar, songVar, collectionVar], [this.view.fileInput, this.view.songInput, this.view.collectionInput])
    }

    this.view.fileInput.addEventListener('change', e => {
      uploadBlocker.ternaryBlock(
        e.target.files.length === 0 && !this.model.id,
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
  constructor (fileId) {
    super()
    const model = new FileModel(fileId)
    const view = new FileView()
    this.controller = new FileController(model, view)
  }
}

/**
   * Generates HTML for an audio element based on a file
   * @param {Row} file
   * @returns {string}
   */
export function generateAudio (file) {
  const name = file.original_name || file.originalname || ''
  const filePath = file.file_name || file.filename || ''
  let extension = name.match(/\.(.*?)$/)
  // in case there is no match
  if (extension) extension = extension[1]

  const validExtensions = [
    'mp3',
    'wav',
    'flac',
    'm4a',
    'ogg'
  ]

  if (extension && validExtensions.includes(extension)) {
    return `
        <audio src="../music/${filePath}" controls data-name="${name}"></audio>
      `
  }
  return '<div>Could not load</div>'
}
