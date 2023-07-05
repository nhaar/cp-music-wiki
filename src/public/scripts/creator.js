import { postJSON } from './utils.js'

/*******************************************************
* model
*******************************************************/

const typeSelect = document.querySelector('.js-select-type')
const createSection = document.querySelector('.js-create-section')

/** Holds all the type names displayed and functions to render their creation menu */
const types = {
  Song: renderSongCreate,
  Author: renderAuthorCreate
}

/*******************************************************
* view
*******************************************************/

// populate select options
let isFirstOne = true
for (const type in types) {
  if (isFirstOne) {
    isFirstOne = false
    types[type]()
  }
  typeSelect.innerHTML += `
    <option value="${type}"> ${type} </option>
  `
}

/**
 * Renders the song creation menu
 */
function renderSongCreate () {
  const songName = 'js-song-name'
  const createButton = 'js-create-button'
  createSection.innerHTML = `
    <input class="${songName}" type="text">
    <button class="${createButton}">
      Create song
    </button>  
  `

  // add song to database
  addCreateListener(songName, createButton, 'api/create-song')
}

/**
 * Renders the author creation menu
 */
function renderAuthorCreate () {
  const authorName = 'js-author-name'
  const authorButton = 'js-author-button'
  createSection.innerHTML = `
    <input class="${authorName}" type="text">
    <button class="${authorButton}">
      Create author page
    </button>
  `

  addCreateListener(authorName, authorButton, 'api/create-author')
}

/*******************************************************
* controler
*******************************************************/

typeSelect.addEventListener('change', () => {
  types[typeSelect.value]()
})

// add author to database

/**
 * Add a listener to submit a post request for creating by name
 * @param {string} inputClass - Class of the input element with the name
 * @param {string} buttonClass - Class of the button element to submit
 * @param {string} route - Route for the post request
 */
function addCreateListener (inputClass, buttonClass, route) {
  const inputElement = document.querySelector('.' + inputClass)
  const buttonElement = document.querySelector('.' + buttonClass)
  buttonElement.addEventListener('click', () => {
    const name = inputElement.value
    postJSON(route, { name })
  })
}
