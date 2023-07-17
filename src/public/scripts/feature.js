import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { createElement } from './utils.js'

/**
 * @typedef {object} FeatureData
 */

/**
 * @typedef {object} FeatureBuildData
 * @property {FeatureData} feature
 * @property {string} mediaName
 */

class FeatureModel extends EditorModel {
  constructor () {
    super('feature')
  }

  getMediaName = async () => await this.getNameFromId('medias', this.data.mediaId)
}

class FeatureView extends EditorView {
  constructor () { super(undefined) }

  /**
   * Feature buildeditor
   * @param {FeatureBuildData} data
   */
  buildEditor (data) {
    const { feature, mediaName } = data
    const { name, mediaId, releaseDate, isEstimate } = feature

    this.featureName = createElement({ parent: this.editor, tag: 'input', value: name })
    this.featureMedia = createElement({ parent: this.editor, tag: 'input', value: mediaName, dataset: { mediaId } })
    this.featureDate = createElement({ parent: this.editor, tag: 'input', type: 'date', value: releaseDate })
    this.featureCheck = createElement({ parent: this.editor, tag: 'input', type: 'checkbox', checked: isEstimate })
    this.featureButton = createElement({ parent: this.editor, tag: 'button', innerHTML: 'Add feature' })
  }
}

class FeatureController extends EditorController {
  constructor (model, view) {
    super(model, view)
    this.mediaVar = 'mediaId'
  }

  /**
   * Gets the taken media for the feature
   * @param {HTMLInputElement} input - Media name input
   * @returns {import('./query-options.js').TakenInfo}
   */
  getTakenMedia (input) {
    return this.getTakenVariable(input, 'mediaId')
  }

  /**
   * Feature getUserData
   * @returns {FeatureData}
   */
  getUserData () {
    const mediaVar = this.mediaVar

    const name = this.view.featureName.value
    const mediaId = this.view.featureMedia.dataset[mediaVar]
    const date = this.view.featureDate.value
    const isEstimate = this.view.featureCheck.checked

    return { featureId: this.model.id, name, mediaId, date, isEstimate }
  }

  /**
   * Feature getBuildData
   * @returns {FeatureBuildData}
   */
  async getBuildData () {
    const feature = this.model.data
    const mediaName = await this.model.getMediaName()
    return { feature, mediaName }
  }

  /**
   * Feature setupEditor
   */
  setupEditor () {
    const mediaVar = this.mediaVar
    const nameVar = 'name'
    const dateVar = 'date'

    if (!this.model.id) this.submitBlocker.blockVarElements([mediaVar, nameVar, dateVar], [this.view.featureMedia, this.view.featureName, this.view.featureDate])

    setupMustHaveInput(this.view.featureName, this.submitBlocker, nameVar)

    createSearchQuery(
      this.view.featureMedia,
      mediaVar,
      'media_id',
      'name',
      a => this.model.getMediaNames(a),
      a => this.getTakenMedia(a),
      this.submitBlocker
    )

    setupMustHaveInput(this.view.featureDate, this.submitBlocker, dateVar)
  }
}

export class Feature extends EditorType {
  constructor (id) { super(id, FeatureModel, FeatureView, FeatureController) }
}

/**
 * Makes it so that an input always blocks if there is no data in the input
 * and unblocks whenever data is inputed
 * @param {HTMLInputElement} input
 * @param {Blocker} blocker
 * @param {string} blockVar
 */
function setupMustHaveInput (input, blocker, blockVar) {
  input.addEventListener('input', () => {
    blocker.ternaryBlock(
      input.value === '',
      blockVar, input
    )
  })
}
