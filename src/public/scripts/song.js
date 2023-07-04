import { postJSON } from './utils.js'

/**
 * Object containing information from a song
 * @typedef {object} Song
 */

/*******************************************************
* model
*******************************************************/
const nameInput = 'js-name-input'
const submitButton = 'js-submit-button'

const urlParams = new URLSearchParams(window.location.search)
const name = urlParams.get('n')

/** Stores the rowid for the rendered song */
let rowid

/**
 * Collects the information from the elements in the page
 * inside an object representing the song's row info
 * @returns {Song} - Song data from the user
 */
function getUserData () {
  const data = {}
  data.name = document.querySelector('.' + nameInput).value
  data.rowid = rowid

  return data
}

/*******************************************************
* view
*******************************************************/

// get the page info
postJSON('api/get-song', { name })
  .then(response => {
    if (response.status === 200) {
      response.json().then(data => {
        if (data) {
          renderEditor(data)
          // save rowid
          rowid = data.rowid
        }
      })
    } else {
      document.body.innerHTML = 'NO SONG FOUND'
    }
  })

/**
 * Renders the song editor based on an initial set of data
 * @param {Song} data - Song data to use as reference
 */
function renderEditor (data) {
  const { name } = data
  const html = `
    <input class="${nameInput}" type="text" value="${name}">
    <button class="${submitButton}"> Submit </button>
  `

  document.body.innerHTML = html
  setupSubmit()
}

/*******************************************************
* controller
*******************************************************/

/**
 * Sets up the submit button to send the data to the database
 */
function setupSubmit () {
  document.querySelector('.' + submitButton).addEventListener('click', () => {
    const data = getUserData()
    postJSON('api/submit-data', data)
  })
}
