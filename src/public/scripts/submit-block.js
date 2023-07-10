/**
 * Adds the event listeners for the blocking button integration
 * @param {HTMLButtonElement} button - Reference to the button
 * @param {string} eventName - Name of the event for blocking this button
 * @param {string} blockedClass - CSS class for changing button color when blocked
 * @param {function() : void} clickCallback - Function that should run when the button is clicked while unblocked
 */
export function addBlockListener (button, eventName, blockedClass, clickCallback) {
  const blocked = () => isBlocked(button)

  button.addEventListener('click', () => {
    if (!blocked()) clickCallback()
  })
  
  button.addEventListener(eventName, () => {
    if (!blocked()) {
      button.classList.remove(blockedClass)
    } else {
      button.classList.add(blockedClass)
    }
  })
}

/**
 * Blocks or unblocks the submit button for a certain variable
 * and updates button itself if necessary
 * @param {boolean} blocking - True if want to block the variable, false if want to unblock
 * @param {string} variable - Name of data variable
 */
function toggleBlockVariable (blocking, variable, submitClass, eventName) {
  const submitButton = document.querySelector('.' + submitClass)
  const sendEvent = () => sendBlockEvent(eventName, submitButton)
  const previouslyBlocked = isBlocked(submitButton)
  const blockedVariable = submitButton.dataset[variable]

  if (blocking && !blockedVariable) {
    submitButton.dataset[variable] = '1'

    if (!previouslyBlocked) sendEvent()
  } else if (!blocking & blockedVariable) {
    submitButton.dataset[variable] = ''

    if (!isBlocked(submitButton)) sendEvent()
  }
}

/**
 * Dispatches the block event
 * @param {HTMLButtonElement} submitButton - Button reference
 */
function sendBlockEvent (eventName, submitButton) {
  const block = new CustomEvent(eventName)
  submitButton.dispatchEvent(block)
}

/**
 * Checks if the submit button should be blocked
 * @param {HTMLButtonElement} submitButton - Button reference
 * @returns {boolean} True if should be blocked
 */
function isBlocked (submitButton) {
  for (const key in submitButton.dataset) {
    if (submitButton.dataset[key]) return true
  }

  return false
}

/**
 * Block the submit button
 * @param {string} variable - Data variable to block
 * @param {string} submitClass - CSS class for the submit button
 * @param {string} eventName - Event name for blocking
 */
export function block (variable, submitClass, eventName) {
  toggleBlockVariable(true, variable, submitClass, eventName)
}

/**
 * Unblock the submit button
 * @param {string} variable - Data variable to block
 * @param {string} submitClass - CSS class for the submit button
 * @param {string} eventName - Event name for blocking
 */
export function unblock (variable, submitClass, eventName) {
  toggleBlockVariable(false, variable, submitClass, eventName)
}
