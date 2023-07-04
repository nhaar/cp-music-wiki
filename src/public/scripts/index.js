import { postJSON } from './utils.js'

/*******************************************************
* model
*******************************************************/

const songName = document.querySelector('.js-song-name')
const createButton = document.querySelector('.js-create-button')
const authorName = document.querySelector('.js-author-name')
const authorButton = document.querySelector('.js-author-button')

/*******************************************************
* controller
*******************************************************/

// add song to database
addCreateListener(songName, createButton, 'api/create-song')

// add author to database
addCreateListener(authorName, authorButton, 'api/create-author')

/**
 * Add a listener to submit a post request for creating by name
 * @param {HTMLInputElement} inputElement - Input element with the name
 * @param {HTMLButtonElement} buttonElement - Button element to submit
 * @param {string} route - Route for the post request
 */
function addCreateListener (inputElement, buttonElement, route) {
  buttonElement.addEventListener('click', () => {
    const name = inputElement.value
    postJSON(route, { name })
  })
}
