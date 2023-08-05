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
