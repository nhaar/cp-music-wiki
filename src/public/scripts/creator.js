import { postAndGetJSON, postJSON } from './utils.js'
import { createQuery } from './query-options.js'
import { Blocker } from './submit-block.js'

/*******************************************************
* model
*******************************************************/

const typeSelect = document.querySelector('.js-select-type')
const createSection = document.querySelector('.js-create-section')

/** Blocker for the submit new file button */
let uploadBlocker

/** Class for the upload file button */
const uploadFileButton = 'upload-file-button'

/** Holds all the type names displayed and functions to render their creation menu */
const types = {
  Song: renderSongCreate,
  Author: renderAuthorCreate,
  Collection: renderCollectionCreate,
  File: renderFileCreate
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

/**
 * Renders the collection creation menu
 */
function renderCollectionCreate () {
  const inputClass = 'collection-name'
  const buttonClass = 'collection-button'
  createSection.innerHTML = `
    <input class="${inputClass}" type="text">
    <button class="${buttonClass}">
      Create author page
    </button>
  `

  addCreateListener(inputClass, buttonClass, 'api/create-collection')
}

/**
 * Renders the file creation menu
 */
function renderFileCreate () {
  const songInputClass = 'file-song-name'
  const collectionInputClass = 'collection-name'
  const fileClass = 'file-upload'

  createSection.innerHTML = `
    <input class="${songInputClass}" type="text">
    <input class="${collectionInputClass}" type="text">
    <input class="${fileClass}" type="file">
    <button class="${uploadFileButton}">
      Upload file
    </button>
  `

  const fileInput = document.querySelector('.' + fileClass)
  const uploadButton = document.querySelector('.' + uploadFileButton)
  addFileCreateControl(songInputClass, collectionInputClass, fileInput, uploadButton)
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

/**
 * Adds controls to the file creation menu
 * @param {string} songInputClass - Class for the song name input
 * @param {string} collectionInputClass - Class for the collection input
 * @param {HTMLButtonElement} fileInput - Element for the file input
 * @param {HTMLButtonElement} uploadButton - Element for the upload button
 */
function addFileCreateControl (songInputClass, collectionInputClass, fileInput, uploadButton) {
  const songDataVar = 'songId'
  const collectionDataVar = 'collectionId'

  uploadBlocker = new Blocker(uploadButton, () => {
    const songInput = document.querySelector('.' + songInputClass)
    const collectionInput = document.querySelector('.' + collectionInputClass)

    const songId = songInput.dataset[songDataVar]
    const collectionId = collectionInput.dataset[collectionDataVar]
    const file = fileInput.files[0]

    const formData = new FormData()
    formData.append('file', file)
    formData.append('songId', songId)
    formData.append('collectionId', collectionId)

    fetch('api/submit-file', {
      method: 'POST',
      body: formData
    })
  })

  const fileVar = 'file'
  const songVar = 'name'
  const collectionVar = 'collection'
  const vars = [fileVar, songVar, collectionVar]
  vars.forEach(variable => uploadBlocker.block(variable))
  fileInput.addEventListener('change', e => {
    if (e.target.files.length === 0) {
      uploadBlocker.block(fileVar)
    } else {
      uploadBlocker.unblock(fileVar)
    }
  })

  // query for song name
  createQuery(createSection, songInputClass, {
    fetchDataFunction: getSongNames,
    checkTakenFunction: getTakenSong,
    dataVar: songDataVar,
    databaseVar: 'song_id',
    databaseValue: 'name_text'
  }, {
    blockVar: songVar,
    blocker: uploadBlocker
  })

  // query for collection name
  createQuery(createSection, collectionInputClass, {
    fetchDataFunction: getCollectionNames,
    checkTakenFunction: getTakenCollection,
    dataVar: collectionDataVar,
    databaseVar: 'collection_id',
    databaseValue: 'name'
  }, {
    blockVar: collectionVar,
    blocker: uploadBlocker
  })
}

/**
 * Gets the taken data for the song name
 * @param {HTMLInputElement} input - The song name input
 * @returns {import('./query-options.js').TakenInfo}
 */
function getTakenSong (input) {
  return getTakenVariable(input, 'songId')
}

/**
 * Gets the taken data for the collection
 * @param {HTMLInputElement} input - The collection name input
 * @returns {import('./query-options.js').TakenInfo}
 */
function getTakenCollection (input) {
  return getTakenVariable(input, 'collectionId')
}

/**
 * Gets the taken data for one of the inputs
 * @param {HTMLInputElement} element - Reference to the input
 * @param {string} variable - Name of data variable
 * @returns {import('./query-options.js').TakenInfo}
 */
function getTakenVariable (element, variable) {
  const value = element.dataset[variable]
  const hasUntakenId = !value
  const takenIds = [value]
  return { hasUntakenId, takenIds }
}

/**
 * Gets all songs based on a keyword
 * @param {string} keyword
 * @returns {import('./editor.js').Row[]}
 */
async function getSongNames (keyword) {
  const rows = await postAndGetJSON('api/get-main-names', { keyword })
  return rows
}

/**
 * Gets all collections based on a keyword
 * @param {string} keyword
 * @returns {import('./editor.js').Row[]}
 */
async function getCollectionNames (keyword) {
  const rows = await postAndGetJSON('api/get-collection-names', { keyword })
  // const rows = await postAndGetJSON('api/', { keyword })
  return rows
}
