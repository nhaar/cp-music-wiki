import { Blocker } from './submit-block.js'
import { createElement, postJSON } from './utils.js'

/**
 * Base for the View classes for the editor related objects
 */
export class EditorView {
  /**
   * Renders the submit data button at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }
}

/**
 * Base for the Controller classes for the editor related objects
 */
export class EditorController {
  constructor () {
    this.submitBlocker = new Blocker()
  }

  /**
   * Sets up the submit button controls
   * @param {string} route - Route to push the data to
   * @param {function() : object} dataFunction - Function that returns the data to be sent
   */
  setupSubmitButton (route, dataFunction) {
    this.submitBlocker.button = this.view.submitButton
    this.submitBlocker.clickCallback = () => {
      const data = dataFunction()
      postJSON(route, data)
    }
    this.submitBlocker.addListeners()
  }
}
