import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { createElement, getTakenVariable } from './utils.js'

/**
 * @typedef FileData
 * @property {string} fileId
 * @property {string} sourceId
 * @property {string} filename
 * @property {string} originalname
 * @property {boolean} isHQ
 * @property {string} sourceLink
 */

class FileModel extends EditorModel {
  constructor () {
    super('file', { meta: {} })
  }

  getSongName = async () => await this.getNameFromId('song_names', this.data.songId)
  getSourceName = async () => await this.getNameFromId('sources', this.data.sourceId)

  /**
   * File overwrite update method, needed because the data needs to be submitted as
   * form data as opposed to a JSON
   * @param {object} data - A FileData object with an extra file object
   * @property {object} data.file - User file from the file input
   */
  update (data) {
    const { source, file, filename, originalname, sourceLink, isHQ } = data
    const formData = new FormData()
    if (file) {
      formData.append('file', file)
    } else {
      formData.append('filename', filename)
      formData.append('originalname', originalname)
    }
    formData.append('id', this.id)
    formData.append('source', source)
    formData.append('sourceLink', sourceLink)
    const stringBool = isHQ ? '1' : ''
    formData.append('isHQ', stringBool)

    fetch('api/submit-file', {
      method: 'POST',
      body: formData
    })
  }
}

class FileView extends EditorView {
  /**
   * File buildEditor
   * @param {object} data
   * @param {FileData} data.file
   * @param {string} data.songName
   * @param {string} data.sourceName
   */
  buildEditor (data) {
    const { file } = data
    const { source, sourceLink, isHQ } = file
    // const { songId, songName, sourceName } = meta

    this.sourceInput = createElement({ parent: this.editor, tag: 'input', dataset: { id: source } })
    this.fileInput = createElement({ parent: this.editor, tag: 'input', type: 'file' })
    this.filePreview = createElement({ parent: this.editor, innerHTML: generateAudio(file) })
    this.linkInput = createElement({ parent: this.editor, tag: 'input', value: sourceLink })
    this.checkbox = createElement({ parent: this.editor, tag: 'input', type: 'checkbox', checked: isHQ })
  }
}

class FileController extends EditorController {
  constructor (model, view) {
    super(model, view)

    /** Blocking variable for the song input */
    this.songVar = 'songId'

    /** Blocking variable for the source input */
    this.sourceVar = 'sourceId'
  }

  /**
   * File getBuildData
   * @returns {object}
   */
  async getBuildData () {
    const file = this.model.data

    return { file }
  }

  /**
   * File getUserData
   * @returns {object}
   */
  getUserData () {
    const source = this.view.sourceInput.dataset.id
    const sourceLink = this.view.linkInput.value
    const isHQ = this.view.checkbox.checked

    const file = this.view.fileInput.files[0]
    let originalname
    let filename

    if (!file) {
      const audioElement = this.view.filePreview.children[0]
      originalname = audioElement.dataset.name
      filename = audioElement.src.match(/\/([^/]+)$/)[1]
    }

    return { source, file, originalname, filename, sourceLink, isHQ }
  }

  /**
   * File setupEditor
   */
  setupEditor () {
    if (!this.model.id) {
      this.view.filePreview.classList.add('hidden')
    } else {
      this.view.fileInput.classList.add('hidden')
    }

    createSearchQuery(
      this.view.sourceInput,
      'source'
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
   * Gets the taken data for the source
   * @param {HTMLInputElement} input - The source name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenSource (input) {
    return getTakenVariable(input, 'sourceId')
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
