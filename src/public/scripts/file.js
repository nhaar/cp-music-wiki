import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { createElement, getTakenVariable } from './utils.js'

/**
 * @typedef FileData
 * @property {string} fileId
 * @property {string} songId
 * @property {string} collectionId
 * @property {string} filename
 * @property {string} originalname
 */

class FileModel extends EditorModel {
  constructor () {
    super('file')
  }

  getSongName = async () => await this.getNameFromId('song_names', this.data.songId)
  getCollectionName = async () => await this.getNameFromId('collections', this.data.collectionId)

  /**
   * File overwrite update method, needed because the data needs to be submitted as
   * form data as opposed to a JSON
   * @param {object} data - A FileData object with an extra file object
   * @property {object} data.file - User file from the file input
   */
  update (data) {
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
}

class FileView extends EditorView {
  constructor () { super(undefined) }

  /**
   * File buildEditor
   * @param {object} data
   * @param {FileData} data.file
   * @param {string} data.songName
   * @param {string} data.collectionName
   */
  buildEditor (data) {
    const { file, songName, collectionName } = data
    const { songId, collectionId } = file

    this.songInput = createElement({ parent: this.editor, tag: 'input', value: songName, dataset: { songId } })
    this.collectionInput = createElement({ parent: this.editor, tag: 'input', value: collectionName, dataset: { collectionId } })
    this.fileInput = createElement({ parent: this.editor, tag: 'input', type: 'file' })
    this.filePreview = createElement({ parent: this.editor, innerHTML: generateAudio(file) })
  }
}

class FileController extends EditorController {
  constructor (model, view) {
    super(model, view)

    /** Blocking variable for the song input */
    this.songVar = 'songId'

    /** Blocking variable for the collection input */
    this.collectionVar = 'collectionId'
  }

  /**
   * File getBuildData
   * @returns {object}
   */
  async getBuildData () {
    const file = this.model.data
    const songName = await this.model.getSongName()
    const collectionName = await this.model.getCollectionName()

    return { file, songName, collectionName }
  }

  /**
   * File getUserData
   * @returns {object}
   */
  getUserData () {
    const songVar = this.songVar
    const collectionVar = this.collectionVar

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

    return { fileId: this.model.id, songId, collectionId, file, originalname, filename }
  }

  /**
   * File setupEditor
   */
  setupEditor () {
    const songVar = this.songVar
    const collectionVar = this.collectionVar
    const fileVar = 'file'

    if (!this.model.id) {
      this.submitBlocker.blockVarElements([fileVar, songVar, collectionVar], [this.view.fileInput, this.view.songInput, this.view.collectionInput])
    }

    this.view.fileInput.addEventListener('change', e => {
      this.submitBlocker.ternaryBlock(
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
      this.submitBlocker
    )

    createSearchQuery(
      this.view.collectionInput,
      collectionVar,
      'collection_id',
      'name',
      a => this.model.getCollectionNames(a),
      a => this.getTakenCollection(a),
      this.submitBlocker
    )
  }

  /**
   * Gets the taken data for the song name
   * @param {HTMLInputElement} input - The song name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenSong (input) {
    return getTakenVariable(input, 'songId')
  }

  /**
   * Gets the taken data for the collection
   * @param {HTMLInputElement} input - The collection name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenCollection (input) {
    return getTakenVariable(input, 'collectionId')
  }
}

export class File extends EditorType {
  constructor (id) { super(id, FileModel, FileView, FileController) }
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