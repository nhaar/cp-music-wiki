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

  // author ids are saved as data variables in inputs
  const authors = []
  const authorInputs = document.querySelectorAll('.' + authorInput)
  authorInputs.forEach(input => authors.push(input.dataset.authorId))

  const data = {}
  data.name = document.querySelector('.' + nameInput).value
  data.authors = authors
  data.rowid = id

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
  getFromDatabase('api/get-song', id, 'NO SONG FOUND', async data => {
    const nameInput = 'js-name-input'
    const authorInput = 'author'
    const authorRow = 'author-row'
    const authorDiv = 'authors-div'
    const submitButton = 'js-submit-button'
    const addButton = 'add-button'
    const delButton = 'del-button'
    const moveButton = 'move-button'

    const { name, authors } = data

    // filter and order author names
    const authorInfo = await getAuthorNames('')
    authorInfo.forEach(info => {
      const index = authors.indexOf(info.rowid)
      if (index > -1) {
        authors[index] = info
      }
    })

    let authorsHTML = ''
    authors.forEach(author => {
      authorsHTML += `<div class=${authorRow}>${generateAuthorRow(authorInput, author, delButton, moveButton)}</div>`
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
    addRowControls(authorDiv, authorRow, delButton, moveButton, authorInput)
    setupAddAuthorButton(addButton, authorRow, authorInput, delButton, moveButton)

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
 * @param {object} author - Author main info
 * @param {string} author.rowid - Author id
 * @param {string} author.name - Author name
 * @param {string} deleteClass - Class for the delete button
 * @returns {string} HTML string
 */
function generateAuthorRow (inputClass, author, deleteClass, moveClass) {
  return `
    <input class="${inputClass}" type="text" value="${author.name}" data-author-id="${author.rowid}">
    <button class="${deleteClass}"> X </button>
    <button class="${moveClass}"> M </button>
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
 * @param {string} moveClass - Class for the move button
 * @param {string} inputClass - Class for the name input
 */
function setupAddAuthorButton (addClass, rowClass, inputClass, deleteClass, moveClass) {
  const addButton = document.querySelector('.' + addClass)
  addButton.addEventListener('click', () => {
    const newRow = document.createElement('div')
    newRow.classList.add(rowClass)
    newRow.innerHTML = generateAuthorRow(inputClass, { rowid: '', name: '' }, deleteClass, moveClass)
    addButton.parentElement.insertBefore(newRow, addButton)
    addRowControl(newRow, deleteClass, moveClass, inputClass)
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
 * Add control to all of the current rows and setup
 *
 * Must only be used once due to it setting up the
 * listener for moving rows
 * @param {string} divClass - Author div class name
 * @param {string} rowClass - Row class name
 * @param {string} deleteClass - Delete button class
 * @param {string} moveClass - Move button class
 * @param {string} inputClass - Class for the name input
 */
function addRowControls (divClass, rowClass, deleteClass, moveClass, inputClass) {
  const authorsDiv = document.querySelector('.' + divClass)
  const rows = document.querySelectorAll('.' + rowClass)

  rows.forEach(row => {
    addRowControl(row, deleteClass, moveClass, inputClass)
  })

  // to move rows
  authorsDiv.addEventListener('mouseup', () => {
    if (authorsDiv.dataset.isMoving) {
      authorsDiv.dataset.isMoving = ''
      const destination = Number(authorsDiv.dataset.hoveringRow)
      const origin = Number(authorsDiv.dataset.currentRow)

      // don't move if trying to move on itself
      if (destination !== origin) {
        // offset is to possibly compensate for indexes being displaced
        // post deletion
        const offset = destination > origin ? 1 : 0
        const originElement = authorsDiv.children[origin]
        const targetElement = authorsDiv.children[destination + offset]
        authorsDiv.removeChild(originElement)
        authorsDiv.insertBefore(originElement, targetElement)
      }
    }
  })
}

/**
 * Add controls to an author row
 * @param {HTMLDivElement} row - Element for the row
 * @param {string} deleteClass - Delete button class
 * @param {string} moveClass - Move button class
 * @param {string} inputClass - Class for the name input
 */
function addRowControl (row, deleteClass, moveClass, inputClass) {
  const authorsDiv = row.parentElement
  const deleteButton = row.querySelector('.' + deleteClass)
  deleteButton.addEventListener('click', () => {
    removeAuthor(deleteButton)
  })

  const moveButton = row.querySelector('.' + moveClass)

  // start dragging
  moveButton.addEventListener('mousedown', () => {
    const index = indexOfChild(authorsDiv, row)
    authorsDiv.dataset.currentRow = index
    authorsDiv.dataset.isMoving = '1'
  })

  // hover listener
  row.addEventListener('mouseover', () => {
    const index = indexOfChild(authorsDiv, row)
    authorsDiv.dataset.hoveringRow = index
  })

  // element to have the available options
  const queryOptions = document.createElement('div')
  queryOptions.className = 'author-options'
  row.appendChild(queryOptions)

  const input = row.querySelector('.' + inputClass)

  // flag for hovering options or not
  const listenerRel = { mouseover: '1', mouseout: '' }
  for (const event in listenerRel) {
    queryOptions.addEventListener(event, () => (input.dataset.choosing = listenerRel[event]))
  }

  const updateQuery = updateId => updateQueryOptions(input, queryOptions, updateId)
  input.addEventListener('input', () => updateQuery(true))
  input.addEventListener('focus', () => updateQuery(false))
  input.addEventListener('blur', () => {
    // track if the user is focusing out by picking an option
    if (!input.dataset.choosing) {
      queryOptions.innerHTML = ''
    }
  })
}

/**
 * Helper function to get the index of a child
 * inside an element (0-indexed)
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child to finx index of
 * @param {boolean} - True if represents an input (the text changing)
 * @returns {number} Index
 */
function indexOfChild (parent, child) {
  return [...parent.children].indexOf(child)
}

function updateQueryOptions (input, queryOptions, updateId) {
  // reset ID if altered anything
  if (updateId) input.dataset.authorId = ''

  getAuthorNames(input.value).then(data => {
    // fetching all taken authors
    const authorsDiv = input.parentElement.parentElement
    const allInputs = authorsDiv.querySelectorAll('input')
    const takenIds = []
    allInputs.forEach(input => {
      const id = input.dataset.authorId
      if (id) takenIds.push(id)
    })

    queryOptions.innerHTML = ''
    data.forEach(author => {
      const authorOption = document.createElement('div')
      authorOption.innerHTML = author.name
      authorOption.addEventListener('click', () => {
        queryOptions.innerHTML = ''
        input.dataset.authorId = author.rowid
        input.value = author.name
      })

      // filtering taken authors
      if (!takenIds.includes(author.rowid + '')) {
        queryOptions.appendChild(authorOption)
      }
    })
  })
}

/**
 * Get all authors that contains a keyword
 * @param {string} keyword
 * @returns {Row[]}
 */
async function getAuthorNames (keyword) {
  const response = await postJSON('api/get-author-names', { keyword })
  const rows = await response.json()
  return rows
}
