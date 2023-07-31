import { createElement } from '../utils.js'
import { ReadonlyModule } from './main-modules.js'

/**
 * Module for displaying a song's audio file
 */
export class AudioFileModule extends ReadonlyModule {
  /**
   * Render the audio player
   */
  prebuild () {
    this.audioParent = createElement({ parent: this.e, innerHTML: generateAudio(this.out.read()) })
  }
}

/**
 * Generates HTML for an audio element based on a file
 * @param {import('../../app/database.js').TypeData} file - Data for the file
 * @returns {string} Generated HTML for the audio element
 */
function generateAudio (file) {
  const name = file.originalname || ''
  const filePath = file.filename || ''
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
    return `<audio src="../music/${filePath}" controls data-name="${name}"></audio>`
  }
  return '<div>Could not load</div>'
}
