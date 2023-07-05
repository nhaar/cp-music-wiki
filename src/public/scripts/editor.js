import { postJSON } from './utils.js'

/**
 * Object containing information from a row in a table
 * @typedef {object} Row
 */

/*******************************************************
* model
*******************************************************/

/** The element that contains all the elements in the page */
const editor = document.querySelector('.js-editor')

const urlParams = new URLSearchParams(window.location.search)
const params = paramsToObject(urlParams)

// find what type of thing to edit
switch (params.t) {
  case '0': {
    renderSongEditor(params.id)
    break
  }
  default: {
    editor.innerHTML = 'ERROR'
    break
  }
}

/**
 * Converts URL parameters into an object
 * containing the values of each of the query parameters
 * @param {URLSearchParams} urlParams - URL parameters to target
 * @returns {object} Object for the query parameters
 */
function paramsToObject (urlParams) {
  const params = {}
  const paramsArray = [...urlParams.entries()]
  paramsArray.forEach(array => {
    params[array[0]] = array[1]
  })
  return params
}

/**
 * Gather song data from the page inside
 * a song editor
 * @param {string} nameInput - Class of the input containing the name
 * @param {string} id - Id of the song
 * @returns {Row} Song data from the user
 */
function getSongData (nameInput, id) {
  const data = {}
  data.name = document.querySelector('.' + nameInput).value
  data.rowid = id

  return data
}

/*******************************************************
* view
*******************************************************/

/**
 * Renders the song editor for a specific song
 * @param {string} id - Id of the song
 */
function renderSongEditor (id) {
  postJSON('api/get-song', { id }).then(response => {
    if (response.status === 200) {
      response.json().then(data => {
        if (data) {
          const nameInput = 'js-name-input'
          const submitButton = 'js-submit-button'

          const { name } = data
          const html = `
            <input class="${nameInput}" type="text" value="${name}">
            <button class="${submitButton}"> Submit </button>
          `

          editor.innerHTML = html
          setupSubmitSong(submitButton, nameInput, id)
        }
      })
    } else {
      editor.innerHTML = 'NO SONG FOUND'
    }
  })
}

/*******************************************************
* controller
*******************************************************/

/**
 * Sets up a submit button to send the song data to the database
 * @param {string} submitButton - Class of the button to submit data
 * @param {string} nameInput - Class of the input containing the name
 * @param {string} id - Id of the song
 */
function setupSubmitSong (submitButton, nameInput, id) {
  document.querySelector('.' + submitButton).addEventListener('click', () => {
    const data = getSongData(nameInput, id)
    postJSON('api/submit-data', data)
  })
}
