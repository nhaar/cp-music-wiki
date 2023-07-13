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

    if (button && clickCallback) {
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
      if (!this.isBlocked()) this.removeBlockedClass(this.button)
      else this.addBlockedClass(this.button)
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
    this.toggleBlock(true, variable)
  }

  /**
   * Unblock a variable
   * @param {string} variable - Data variable
   */
  unblock (variable) {
    this.toggleBlock(false, variable)
  }

  /**
   * Blocks a variable and adds the blocked class to an element
   * @param {variable} variable
   * @param {HTMLElement} element
   */
  blockElement (variable, element) {
    this.block(variable)
    this.addBlockedClass(element)
  }

  /**
   * Unlocks a variable and removes the blocked class to an element
   * @param {variable} variable
   * @param {HTMLElement} element
   */
  unblockElement (variable, element) {
    this.unblock(variable)
    this.removeBlockedClass(element)
  }

  /**
   * Adds the blocked class to an element
   * @param {HTMLElement} element
   */
  addBlockedClass (element) {
    element.classList.add(this.blockedClass)
  }

  /**
   * Removes the blocked class of an element
   * @param {HTMLElement} element
   */
  removeBlockedClass (element) {
    element.classList.remove(this.blockedClass)
  }

  /**
   * Runs a ternary based on a condition that if is true, will block a variable and add the blocked class to an element, otherwise, unblock and remove the class
   *
   * Further actions can be supplied with the callbacks
   * @param {boolean} condition
   * @param {string} variable
   * @param {HTMLElement} element
   * @param {function() : void} trueCallback
   * @param {function() : void} falseCallback
   */
  ternaryBlock (condition, variable, element, trueCallback, falseCallback) {
    if (condition) {
      this.blockElement(variable, element)
      if (trueCallback) trueCallback()
    } else {
      this.unblockElement(variable, element)
      if (falseCallback) falseCallback()
    }
  }

  /**
   * Blocks all variables in the array of variables and adds the blocked class to all elements in the array of elements
   * @param {string[]} vars
   * @param {HTMLElement[]} elements
   */
  blockVarElements (vars, elements) {
    vars.forEach(variable => this.block(variable))
    elements.forEach(element => this.addBlockedClass(element))
  }
}
