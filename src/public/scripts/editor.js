import { postAndGetJSON, postJSON } from './utils.js'
import { createQuery } from './query-options.js'
import { addBlockListener, block, unblock } from './submit-block.js'

/* global CustomEvent */

/**
 * Object containing information from a row in a table
 * @typedef {object} Row
 */

/**
 * Data structure for a song
 * @typedef {object} Song
 * @property {string} songId
 * @property {string[]} names
 * @property {string[]} authors
 */

/**
 * Object containing name for element classes
 * @typedef {object} Elements
 */

/**
 * @typedef {object} RowData
 * @property {string} value
 * @property {object} dataset
 */

/*******************************************************
* model
*******************************************************/

/** The element that contains all the elements in the page */
const editor = document.querySelector('.js-editor')

const urlParams = new URLSearchParams(window.location.search)
const params = paramsToObject(urlParams)

/** Name for the event that is responsible for disabling the submit button */
const lockSubmission = 'block'

/** CSS class name for the blocked submit button */
const blockedClass = 'blocked-button'

/** CSS class for the submit button */
const submitClass = 'js-submit-button'

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
  case '2': {
    renderCollectionEditor(params.id)
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
 * @param {string} songId
 * @returns {Row} Song data from the user
 */
function getSongData (elements, songId) {
  const { nameInput, authorInput, linkInput } = elements

  // author ids are saved as data variables in inputs
  const names = collectInputData(nameInput, false)
  const authors = collectInputData(authorInput, true, 'authorId')
  const link = document.querySelector('.' + linkInput).value

  const data = { songId, names, authors, link }

  return data
}

/**
 * Saves data from all inputs under a certain class
 * @param {string} inputClass - All elements to collect the data
 * @param {boolean} isDataset - True if the searching data variable, false if searching value
 * @param {string} dataProperty - If isDataset, this is the name of the data variable
 * @returns {string[]} Array with all the data
 */
function collectInputData (inputClass, isDataset, dataProperty) {
  const mapFunction = isDataset
    ? input => input.dataset[dataProperty]
    : input => input.value
  return [...document.querySelectorAll('.' + inputClass)].map(mapFunction)
}

/**
 * Gather author data from the page inside
 * an author editor
 * @param {Elements} elements
 * @param {string} authorId
 * @returns {Row} Author data from the user
 */
function getAuthorData (elements, authorId) {
  const { nameInput } = elements
  const name = document.querySelector('.' + nameInput).value
  const data = { authorId, name }

  return data
}

/**
 * Gather collection data from the page
 * inside a collection editor
 * @param {Elements} elements 
 * @param {string} collectionId 
 * @returns {Row} Collection data
 */
function getCollectionData (elements, collectionId) {
  const { nameInput } = elements
  const name = document.querySelector('.' + nameInput).value
  const data = {collectionId, name }

  return data
}

/**
 * Get an item from the database
 * and render its editor
 * @param {string} route - Route to get
 * @param {string} id - Id of item in the table
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

/**
 * Gets information about the taken authors
 * (ie authors that were picked by an input)
 * @param {HTMLInputElement} input - One of the inputs for authors
 * @returns {object}
 * Object containing:
 *
 * @property {string[]} - Array of all authors that belong to an input
 * @property {boolean} hasUntakenId - True if any input doesn't have an author id
 */
function getAllTakenAuthors (input) {
  const authorsDiv = input.parentElement.parentElement
  const allInputs = authorsDiv.querySelectorAll('input')
  const takenIds = []
  let hasUntakenId = false
  allInputs.forEach(input => {
    const { authorId } = input.dataset
    if (authorId) takenIds.push(authorId)
    else hasUntakenId = true
  })

  return {
    takenIds,
    hasUntakenId
  }
}

/*******************************************************
* view
*******************************************************/

/**
 * Renders the song editor for a specific song
 * @param {string} songId
 */
function renderSongEditor (songId) {
  getFromDatabase('api/get-song', songId, 'NO SONG FOUND', async data => {
    editor.innerHTML = ''
    const elements = {}

    const { names, authors, link } = data

    // filter and order author names
    const authorInfo = await getAuthorNames('')
    authorInfo.forEach(info => {
      const index = authors.indexOf(info.author_id)
      if (index > -1) {
        authors[index] = info
      }
    })

    // draw editor elements
    elements.nameInput = renderSongNames(names)
    elements.authorInput = renderSongAuthors(authors)
    elements.linkInput = renderLinkInput(link)

    // draw submit button
    const submitButton = document.createElement('button')
    submitButton.className = submitClass
    submitButton.innerHTML = 'Submit'
    editor.appendChild(submitButton)
    setupSubmitSong(elements, songId)
  })
}

/**
 * Renders the song editor for a specific author
 * @param {string} authorId
 */
function renderAuthorEditor (authorId) {
  getFromDatabase('api/get-author', authorId, 'NO AUTHOR FOUND', data => {
    const nameInput = 'js-name-input'

    const { name } = data
    const html = `
      <input class="${nameInput}" type="text" value="${name}">
      <button class="${submitClass}"> Submit </button>
    `

    editor.innerHTML = html
    const elements = { nameInput }
    setupSubmitAuthor(elements, authorId)
  })
}

/**
 * Renders the collection editor for a specific collection
 * @param {string} collectionId 
 */
function renderCollectionEditor (collectionId) {
  getFromDatabase('api/get-collection', collectionId, 'NO COLLECTION FOUND', data => {
    const nameInput = 'collection-input'

    const { name } = data
    const html = `
      <input class="${nameInput}" type="text" value="${name}">
      <button class="${submitClass}"> Submit </button>
    `

    editor.innerHTML = html
    const elements = { nameInput }
    setupSubmitCollection(elements, collectionId)
  })
}

/**
 * Render an element with moveable rows of inputs
 * @param {*[]} rows - Arrays with the data to be put into row, is arbitrary and will communicate with rowCallback
 * @param {string} inputClass
 * @param {string} divClass Class of the div that will contain all the elements
 * @param {function(Row) : RowData} rowCallback
 * Function that takes the data from the database and turns into a format
 * to be put inside the input
 * @param {function(string, object)} setupCallback
 * Function that setups the controls, first argument is the div
 * that contians all moveable rows and the second argument
 * is an object with all the class names
 * @returns {string} The input class
 */
function renderMoveableRows (rows, inputClass, divClass, rowCallback, setupCallback) {
  const rowClass = 'moveable-row'
  const addClass = 'add-button'
  const delClass = 'del-button'
  const moveClass = 'move-button'
  const classes = { divClass, inputClass, rowClass, addClass, delClass, moveClass }

  const rowsDiv = document.createElement('div')
  rowsDiv.className = divClass

  let html = ''
  rows.forEach(row => {
    const rowData = rowCallback(row)
    html += `<div class=${rowClass}>${generateMoveableRow(rowData, classes)}</div>`
  })

  rowsDiv.innerHTML = html + `
  <button class="${addClass}">
    ADD
  </button>
  `

  editor.appendChild(rowsDiv)

  setupCallback(rowsDiv, classes)

  return inputClass
}

/**
 * Render the song authors moveable list
 * @param {object[]} authors Array with authors information
 * @returns {string} Class for the author name inputs
 */
function renderSongAuthors (authors) {
  return renderMoveableRows(authors, 'author', 'authors-div', authorRowCallback, setupAuthorDivControls)
}

/**
 * Render the song names moveable list
 * @param {string[]} names Array with all the names
 * @returns {string} Class for the song name inputs
 */
function renderSongNames (names) {
  return renderMoveableRows(names, 'name-input', 'name-div', nameRowCallback, setupNameDivControls)
}

/**
 * Render the input for the video link
 * @param {string} link - Video link string
 * @returns {string} Class for the link input
 */
function renderLinkInput (link) {
  const inputClass = 'link-input'

  const linkInput = document.createElement('input')
  linkInput.className = inputClass
  linkInput.value = link

  setupLinkControls(linkInput)
  editor.appendChild(linkInput)

  return inputClass
}

/**
 * Generates the HTML for a moveable row
 * @param {RowData} rowData Data for this row
 * @param {object} classes Object with all the class names
 * @returns {string} HTML for the row
 */
function generateMoveableRow (rowData, classes) {
  const { inputClass, delClass, moveClass } = classes
  let dataset = ''
  for (const data in rowData.dataset) {
    dataset += `data-${data}="${rowData.dataset[data]}"`
  }

  return `
    <input class="${inputClass}" type="text" value="${rowData.value}"${dataset}">
    <button class="${delClass}"> X </button>
    <button class="${moveClass}"> M </button>
  `
}

/**
 * Get the row data from an author row in the database
 * @param {object} author Object with name and id
 * @returns {RowData}
 */
function authorRowCallback (author) {
  return {
    value: author.name,
    dataset: {
      'author-id': author.author_id
    }
  }
}

/**
 * Get the row data for a name
 * @param {string} name
 * @returns {RowData}
 */
function nameRowCallback (row) {
  return { value: row }
}

/*******************************************************
* controller
*******************************************************/

/**
 * Sets up a submit button to send the song data to the database
 * @param {Elements} elements
 * @param {string} songId
 */
function setupSubmitSong (elements, songId) {
  setupSubmitButton(elements, songId, 'api/submit-data', getSongData)
}

/**
 * Sets up a submit button to send the author data to the database
 * @param {Elements} elements
 * @param {string} authorId
 */
function setupSubmitAuthor (elements, authorId) {
  setupSubmitButton(elements, authorId, 'api/submit-author', getAuthorData)
}

/**
 * Sets up a submit button to send the collection data
 * to the database
 * @param {Elements} elements 
 * @param {string} collectionId 
 */
function setupSubmitCollection (elements, collectionId) {
  setupSubmitButton(elements, collectionId, 'api/submit-collection', getCollectionData)
}

/**
 * Base function to setup a submit button to send
 * data to the database
 * @param {Elements} elements
 * @param {string} id - Id to submit
 * @param {string} route - Route to submit
 * @param {function(Elements, string)} dataFunction
 * Function to get the data, which takes as arguments the
 * elements object and the row id
 */
function setupSubmitButton (elements, id, route, dataFunction) {
  const submitButton = document.querySelector('.' + submitClass)

  // handling disabling submissions
  addBlockListener(submitButton, lockSubmission, blockedClass, () => {
    const data = dataFunction(elements, id)
    postJSON(route, data)
  })
}



/**
 * Setup the control to all the rows that currently are present
 * in a moveable row container
 * @param {HTMLDivElement} rowsDiv The container
 * @param {object} classes Object with the classes
 * @param {*} defaultValue Default value for the row data
 * @param {function(*) : RowData} rowCallback Function to convert into row data
 * @param {function} controlCallback Function to add control to a single row
 * @param {*} rowsCallback
 * @param {*} setupCallback
 * @param {*} clickCallback
 */
function setupRowControls (
  rowsDiv,
  classes,
  defaultValue,
  rowCallback,
  controlCallback,
  rowsCallback,
  setupCallback,
  clickCallback
) {
  const callbacks = { rowCallback, controlCallback, rowsCallback, clickCallback }
  const addButton = rowsDiv.querySelector('.' + classes.addClass)
  rowsCallback(rowsDiv, classes)
  setupCallback(addButton, classes, defaultValue, callbacks)
}

/**
 * Setup controls for the names editor
 * @param {HTMLDivElement} namesDiv - Div containing names
 * @param {object} classes - Object with class names
 */
function setupNameDivControls (namesDiv, classes) {
  setupRowControls(
    namesDiv,
    classes,
    '',
    nameRowCallback,
    addMoveableRowControl,
    addNameRowControls,
    setupAddMoveableRowButton
  )
}

/**
 * Setup controls for the authors editor
 * @param {HTMLDivElement} authorsDiv - Div containing authors
 * @param {object} classes - Object with class names
 */
function setupAuthorDivControls (authorsDiv, classes) {
  setupRowControls(
    authorsDiv,
    classes,
    { author_id: '', name: '' },
    authorRowCallback,
    addAuthorRowControl,
    addAuthorRowControls,
    setupAddMoveableRowButton,
    () => blockSubmit('author')
  )
}

/**
 * Setup the button that adds new rows in
 * the moveable rows structure
 * @param {HTMLButtonElement} addButton - Reference to the add button
 * @param {object} classes - Object with class names
 * @param {*} blankRow - Model for a blank row (see RowData and rowCallback)
 * @param {object} callbacks - Object containing functions
 */
function setupAddMoveableRowButton (
  addButton, classes, blankRow, callbacks
) {
  const { rowClass } = classes
  const { rowCallback, controlCallback, clickCallback } = callbacks
  addButton.addEventListener('click', () => {
    const newRow = document.createElement('div')
    newRow.classList.add(rowClass)
    newRow.innerHTML = generateMoveableRow(rowCallback(blankRow), classes)
    addButton.parentElement.insertBefore(newRow, addButton)
    controlCallback(newRow, classes)
    if (clickCallback) clickCallback()
  })
}

/**
 * Adds controls to all (current) rows in a moveable row structure
 * @param {HTMLDivElement} rowsDiv - Element containing rows
 * @param {object} classes - Object with class names
 * @param {function(HTMLDivElement, object)} controlCallback
 * Function that takes an element (for a row) and the classes object
 * and adds control to that single row
 */
function addMoveableRowControls (rowsDiv, classes, controlCallback) {
  const { rowClass } = classes
  const rows = rowsDiv.querySelectorAll('.' + rowClass)

  rows.forEach(row => {
    controlCallback(row, classes)
  })

  // to move rows
  rowsDiv.addEventListener('mouseup', () => {
    if (rowsDiv.dataset.isMoving) {
      rowsDiv.dataset.isMoving = ''
      const destination = Number(rowsDiv.dataset.hoveringRow)
      const origin = Number(rowsDiv.dataset.currentRow)

      // don't move if trying to move on itself
      if (destination !== origin) {
        // offset is to possibly compensate for indexes being displaced
        // post deletion
        const offset = destination > origin ? 1 : 0
        const originElement = rowsDiv.children[origin]
        const targetElement = rowsDiv.children[destination + offset]
        rowsDiv.removeChild(originElement)
        rowsDiv.insertBefore(originElement, targetElement)
      }
    }
  })
}

/**
 * Adds control to all the rows in the name editor
 * @param {HTMLDivElement} namesDiv - Div containing the names
 * @param {object} classes - Object with classes
 */
function addNameRowControls (namesDiv, classes) {
  addMoveableRowControls(namesDiv, classes, addMoveableRowControl)
}

/**
 * Adds control to all the rows in the authors editor
 * @param {HTMLDivElement} authorsDiv - Div containing the authors
 * @param {object} classes - Object with classes
 */
function addAuthorRowControls (authorsDiv, classes) {
  addMoveableRowControls(authorsDiv, classes, addAuthorRowControl)
}

/**
 * Add control to a single row in a moveable row structure
 * @param {HTMLDivElement} row - Div element for the row
 * @param {object} classes - Object containing class names
 */
function addMoveableRowControl (row, classes) {
  const { delClass, moveClass } = classes
  const authorsDiv = row.parentElement
  const deleteButton = row.querySelector('.' + delClass)
  deleteButton.addEventListener('click', () => {
    authorsDiv.removeChild(row)
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
}

/**
 * Add controls to an author row
 * @param {HTMLDivElement} row - Element for the row
 * @param {object} classes - Object containing classes
 */
function addAuthorRowControl (row, classes) {
  const { inputClass } = classes
  addMoveableRowControl(row, classes)

  // add query to authors
  createQuery(row, inputClass, {
    fetchDataFunction: getAuthorNames,
    checkTakenFunction: getAllTakenAuthors,
    dataVar: 'authorId',
    databaseVar: 'author_id',
    databaseValue: 'name'
  }, {
    blockVar: 'author',
    blockFunction: blockSubmit,
    unblockFunction: unblockSubmit,
    blockedClass
  })

}

/**
 * Adds control to link input to
 * block submission if invalid link
 * @param {HTMLInputElement} linkInput - Element reference
 */
function setupLinkControls (linkInput) {
  const blockVar = 'link'

  const blockToggle = () => {
    if (!isValidLink(linkInput.value)) blockSubmit(blockVar)
    else unblockSubmit(blockVar)
  }

  linkInput.addEventListener('input', blockToggle)
}

/**
 * Helper function that checks if a link
 * is valid to submit to database
 * @param {string} link
 * @returns {boolean} True if valid
 */
function isValidLink (link) {
  const validFull = link.includes('youtube') && link.includes('watch')
  const validShortened = link.includes('youtu.be/')
  const notLink = link === ''
  return validFull || validShortened || notLink
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




/**
 * Get all authors that contains a keyword
 * @param {string} keyword
 * @returns {Row[]}
 */
async function getAuthorNames (keyword) {
  const rows = await postAndGetJSON('api/get-author-names', { keyword })
  return rows
}

/**
 * Blocks a data variable in the submit button
 * @param {string} variable - Data variable
 */
function blockSubmit (variable) {
  block(variable, submitClass, lockSubmission)
}

/**
 * Unblocks a data variable in the submit button
 * @param {string} variable - Data variable 
 */
function unblockSubmit (variable) {
  unblock(variable, submitClass, lockSubmission)
}
