/* global CustomEvent */

/**
 * A blocker is a way of rendering a button unfunctional if there are things that should be blocking it
 * 
 * Every data variable for the button corresponds to a blocking condition
 * being set to '1' if it is blocking and '' if it's not
 * 
 * This way, if you want to block the button while the user has not done something,
 * you must make that something communicate with the blocker and give it a variable
 * to store
 * 
 * If all stored variables are non blocking, the button can be used normally
 */
export class Blocker {
  /**
   * Saves variables and add event listeners
   * if the all the variables are already given
   * @param {HTMLButtonElement} button - Reference of the button to block
   * @param {function() : void} clickCallback - Callback to run when the button is clicked and not blocked
   */
  constructor (button, clickCallback) {
    Object.assign(this, { button, clickCallback })
    this.eventName = 'block'
    this.blockedClass = 'blocked-button'

    if (this.button && this.clickCallback) {
      this.addListeners()
    }
  }

  /**
   * Adds the event listeners to the button
   */
  addListeners () {
    this.button.addEventListener('click', () => {
      if (!this.isBlocked()) this.clickCallback()
    })

    this.button.addEventListener(this.eventName, () => {
      if (!this.isBlocked()) {
        this.button.classList.remove(this.blockedClass)
      } else {
        this.button.classList.add(this.blockedClass)
      }
    })
  }

  /**
   * Blocks or unblocks the button for a certain variable
   * and updates blocks/unblocks the button itself if necessary
   * @param {boolean} blocking - True if want to block the variable, false if want to unblock
   * @param {string} variable - Data variable
   */
  toggleBlock (blocking, variable) {
    const previouslyBlocked = this.isBlocked()
    const blockedVariable = this.button.dataset[variable]

    if (blocking && !blockedVariable) {
      this.button.dataset[variable] = '1'

      // was not blocked before, so we block buttonn
      if (!previouslyBlocked) this.sendEvent()
    } else if (!blocking & blockedVariable) {
      this.button.dataset[variable] = ''

      // was blocked before and now can be unblocked
      if (!this.isBlocked(this.button)) this.sendEvent()
    }
  }

  /**
   * Dispatches the block event
   */
  sendEvent () {
    const block = new CustomEvent(this.eventName)
    this.button.dispatchEvent(block)
  }

  /**
   * Check if the button should be blocked based on its variables
   * @returns {boolean} True if should be blocked
   */
  isBlocked () {
    for (const key in this.button.dataset) {
      if (this.button.dataset[key]) return true
    }

    return false
  }

  /**
   * Block a variable
   * @param {string} variable - Data variable
   */
  block (variable) {
    console.log('trying to block')
    this.toggleBlock(true, variable)
  }

  /**
   * Unblock a variable
   * @param {string} variable - Data variable
   */
  unblock (variable) {
    console.log('trying to unblock')
    this.toggleBlock(false, variable)
  }
}
