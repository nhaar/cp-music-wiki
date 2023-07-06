import { postJSON } from './utils.js'

/**
 * Object containing information from a row in a table
 * @typedef {object} Row
 */

/**
 * Data structure for a song
 * @typedef {object} Song
 * @property {string} name
 * @property {string[]} authors
 */

/**
 * Object containing name for element classes
 * @typedef {object} Elements
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
  case '1': {
    renderAuthorEditor(params.id)
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
 * @param {Elements} elements
 * @param {string} id - Id of the song
 * @returns {Row} Song data from the user
 */
function getSongData (elements, id) {
  const { nameInput, authorInput } = elements

  const authors = []
  const authorRows = document.querySelectorAll('.' + authorInput)
  authorRows.forEach(row => authors.push(row.value))

  const data = {}
  data.name = document.querySelector('.' + nameInput).value
  data.authors = authors
  data.rowid = id

  console.log(authors)

  return data
}

/**
 * Gather author data from the page inside
 * an author editor
 * @param {Elements} elements
 * @param {string} id - Id of the author
 * @returns {Row} Author data from the user
 */
function getAuthorData (elements, id) {
  const { nameInput } = elements
  console.log(elements)
  const data = {}
  data.name = document.querySelector('.' + nameInput).value
  data.rowid = id

  return data
}

/**
 * Get an item from the database
 * and render its editor
 * @param {string} route - Route to get
 * @param {string} id - Row id to get
 * @param {string} notFoundMessage - Message if none found
 * @param {function(object)} renderFunction
 * Function which takes as argument a row with the data
 * and renders the editor onto the screen
 */
function getFromDatabase (route, id, notFoundMessage, renderFunction) {
  postJSON(route, { id }).then(response => {
    if (response.status === 200) {
      response.json().then(renderFunction)
    } else {
      editor.innerHTML = notFoundMessage
    }
  })
}

/*******************************************************
* view
*******************************************************/

/**
 * Renders the song editor for a specific song
 * @param {string} id - Id of the song
 */
function renderSongEditor (id) {
  getFromDatabase('api/get-song', id, 'NO SONG FOUND', data => {
    const nameInput = 'js-name-input'
    const authorInput = 'author'
    const authorRow = 'author-row'
    const authorDiv = 'authors-div'
    const submitButton = 'js-submit-button'
    const addButton = 'add-button'
    const delButton = 'del-button'

    const { name, authors } = data
    let authorsHTML = ''
    authors.forEach(author => {
      authorsHTML += `<div class=${authorRow}>${generateAuthorRow(authorInput, author, delButton)}</div>`
    })

    const html = `
      <input class="${nameInput}" type="text" value="${name}">
      <div class="${authorDiv}">
        ${authorsHTML}
        <button class="${addButton}"> ADD </button>
      </div>
      <button class="${submitButton}"> Submit </button>
    `

    editor.innerHTML = html

    // controlers
    const rows = document.querySelectorAll('.' + authorRow)
    rows.forEach(row => addRowControls(row, delButton))
    setupAddAuthorButton(addButton, authorRow, authorInput, delButton)

    const elements = { nameInput, authorInput }
    setupSubmitSong(submitButton, elements, id)
  })
}

/**
 * Renders the song editor for a specific author
 * @param {string} id - Author id
 */
function renderAuthorEditor (id) {
  getFromDatabase('api/get-author', id, 'NO AUTHOR FOUND', data => {
    const nameInput = 'js-name-input'
    const submitButton = 'js-submit-button'

    const { name } = data
    const html = `
      <input class="${nameInput}" type="text" value="${name}">
      <button class="${submitButton}"> Submit </button>
    `

    editor.innerHTML = html
    const elements = { nameInput }
    setupSubmitAuthor(submitButton, elements, id)
  })
}

/**
 * Generate the HTML for an author row
 * @param {string} inputClass - Class name for the input
 * @param {string} author - Value of the author
 * @param {string} deleteClass - Class for the delete button
 * @returns {string} HTML string
 */
function generateAuthorRow (inputClass, author, deleteClass) {
  return `
    <input class="${inputClass}" type="text" value="${author}">
    <button class="${deleteClass}"> X </button>
    <button> M </button>
  `
}

/*******************************************************
* controller
*******************************************************/

/**
 * Sets up a submit button to send the song data to the database
 * @param {string} submitButton - Class of the button to submit data
 * @param {Elements} elements
 * @param {string} id - Id of the song
 */
function setupSubmitSong (submitButton, elements, id) {
  setupSubmitButton(submitButton, elements, id, 'api/submit-data', getSongData)
}

/**
 * Sets up a submit button to send the author data to the database
 * @param {string} submitButton - Class of the button to submit data
 * @param {Elements} elements
 * @param {string} id - Id of the author
 */
function setupSubmitAuthor (submitButton, elements, id) {
  setupSubmitButton(submitButton, elements, id, 'api/submit-author', getAuthorData)
}

/**
 * Base function to setup a submit button to send
 * data to the database
 * @param {string} submitButton - Class of the button to submit data
 * @param {Elements} elements
 * @param {string} id - Row id to submit
 * @param {string} route - Route to submit
 * @param {function(Elements, string)} dataFunction
 * Function to get the data, which takes as arguments the
 * elements object and the row id
 */
function setupSubmitButton (submitButton, elements, id, route, dataFunction) {
  document.querySelector('.' + submitButton).addEventListener('click', () => {
    const data = dataFunction(elements, id)
    postJSON(route, data)
  })
}

/**
 * Add control to the add author button
 * @param {string} addClass - Add button class
 * @param {string} rowClass - Class for the row
 * @param {string} inputClass - Class for the author input
 * @param {string} deleteClass - CLass for the delete button
 */
function setupAddAuthorButton (addClass, rowClass, inputClass, deleteClass) {
  const addButton = document.querySelector('.' + addClass)
  addButton.addEventListener('click', () => {
    const newRow = document.createElement('div')
    newRow.classList.add(rowClass)
    newRow.innerHTML = generateAuthorRow(inputClass, '', deleteClass)
    addButton.parentElement.insertBefore(newRow, addButton)
    addRowControls(newRow, deleteClass)
  })
}

/**
 * Remove an author row
 * @param {HTMLButtonElement} deleteButton - Delete button of the row
 */
function removeAuthor (deleteButton) {
  const row = deleteButton.parentElement
  row.parentElement.removeChild(row)
}

/**
 * 
 * @param {HTMLElement} row - HTML element for tha author row
 * @param {string} deleteClass - Delete button class
 */
function addRowControls (row, deleteClass) {
  const deleteButton = row.querySelector('.' + deleteClass)
  deleteButton.addEventListener('click', () => {
    removeAuthor(deleteButton)
  })
}
