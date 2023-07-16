import { EditorModel, EditorController, EditorView, EditorType } from './editor-class.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'
import { createElement } from './utils.js'

class FeatureModel extends EditorModel {
  constructor (featureId) {
    super()
    this.id = featureId
  }

  getFeature = async () => await this.getData('feature', { })
}

class FeatureView extends EditorView {
  constructor () {
    super()
    this.editor = createElement()
  }

  /**
   * Renders the feature creator
   */
  buildEditor (feature, mediaInfo) {
    const { name, mediaId, releaseDate, isEstimate } = feature
    let mediaName
    mediaInfo.forEach(row => {
      if (row.media_id === mediaId) mediaName = row.name
    })

    this.featureName = createElement({ parent: this.editor, tag: 'input', value: name })
    this.featureMedia = createElement({ parent: this.editor, tag: 'input', value: mediaName, dataset: { mediaId } })
    this.featureDate = createElement({ parent: this.editor, tag: 'input', type: 'date', value: releaseDate })
    this.featureCheck = createElement({ parent: this.editor, tag: 'input', type: 'checkbox', checked: isEstimate })
    this.featureButton = createElement({ parent: this.editor, tag: 'button', innerHTML: 'Add feature' })
  }
}

class FeatureController extends EditorController {
  constructor (model, view) {
    super()
    Object.assign(this, { model, view })
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
   * Add controls to the feature creator
   */
  setupFeatureCreator () {
    const mediaVar = 'mediaId'
    const nameVar = 'name'
    const dateVar = 'date'

    const mediaBlocker = new Blocker(this.view.featureButton, () => {
      const name = this.view.featureName.value
      const mediaId = this.view.featureMedia.dataset[mediaVar]
      const date = this.view.featureDate.value
      const isEstimate = this.view.featureCheck.checked

      this.model.update('feature', { featureId: this.model.id, name, mediaId, date, isEstimate })
    })

    if (!this.model.id) mediaBlocker.blockVarElements([mediaVar, nameVar, dateVar], [this.view.featureMedia, this.view.featureName, this.view.featureDate])

    setupMustHaveInput(this.view.featureName, mediaBlocker, nameVar)

    createSearchQuery(
      this.view.featureMedia,
      mediaVar,
      'media_id',
      'name',
      a => this.model.getMediaNames(a),
      a => this.getTakenMedia(a),
      mediaBlocker
    )

    setupMustHaveInput(this.view.featureDate, mediaBlocker, dateVar)
  }

  async initializeEditor (parent) {
    const feature = await this.model.getFeature()
    const mediaInfo = await this.model.getMediaNames('')
    this.view.buildEditor(feature, mediaInfo)
    this.view.renderEditor(parent)
    this.setupFeatureCreator()
  }
}

export class Feature extends EditorType {
  constructor (featureId) {
    super()
    const model = new FeatureModel(featureId)
    const view = new FeatureView()
    this.controller = new FeatureController(model, view)
  }
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
