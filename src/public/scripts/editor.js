import { postAndGetJSON, postJSON } from './utils.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'

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
 * @property {Files} files
 */

/**
 * Each property is a file id and it maps to a boolean representing whether or not
 * it is a high quality source
 * @typedef {object} Files
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

class Model {
  constructor () {
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)
    const type = params.t
    const id = params.id

    Object.assign(this, { type, id })
  }

  /**
   * Converts URL parameters into an object
   * containing the values of each of the query parameters
   * @param {URLSearchParams} urlParams - URL parameters to target
   * @returns {object} Object for the query parameters
   */
  paramsToObject (urlParams) {
    const params = {}
    const paramsArray = [...urlParams.entries()]
    paramsArray.forEach(array => {
      params[array[0]] = array[1]
    })
    return params
  }

  /**
   * Gets the database song object for the target song
   * @returns {Song}
   */
  async getSong () {
    const data = await this.getFromDatabase('api/get-song')
    return data
  }

  async getAuthor () {
    const data = await this.getFromDatabase('api/get-author')
    return data
  }

  async getCollection () {
    const data = await this.getFromDatabase('api/get-collection')
    return data
  }

  /**
   * Get an item from the database
   * @param {string} route - Route to get
   */
  async getFromDatabase (route) {
    const { id } = this
    const response = await postJSON(route, { id })
    if (response.status === 200) {
      const data = await response.json()
      return data
    } else {
      return null
    }
  }

  /**
   * Get all authors that contains a keyword
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getAuthorNames (keyword) {
    const rows = await postAndGetJSON('api/get-author-names', { keyword })
    return rows
  }

  /**
   * Gets the file data for a song
   * @returns {Row[]}
   */
  async getFileData () {
    const rows = await postAndGetJSON('api/get-file-data', { songId: this.id })
    return rows
  }
}

class View {
  constructor () {
    const editor = document.querySelector('.js-editor')
    const submitClass = 'js-submit-button'

    Object.assign(this, { editor, submitClass })
  }

  /**
   * Renders the song editor for a specific song
   * @param {Song} song - Song object
   * @param {Row[]} authorInfo - All the authors in the database
   * @param {Row[]} files -
   */
  renderSongEditor (song, authorInfo, files) {
    const { editor } = this
    // getFromDatabase('api/get-song', songId, 'NO SONG FOUND', async data => {
    if (song) {
      const { names, authors, link } = song

      // filter and order author names
      authorInfo.forEach(info => {
        const index = authors.indexOf(info.author_id)
        if (index > -1) {
          authors[index] = info
        }
      })

      Object.assign(this, { names, authors, link, files })

      // draw editor elements
      this.renderSongNames()
      this.renderSongAuthors()
      this.renderLinkInput()
      this.renderFileCheckmarks()

      this.renderSubmitButton()
    } else {
      editor.innerHTML = 'NO SONG FOUND'
    }
  }

  /**
   * Renders the author editor for an author
   * @param {Row} author
   */
  renderAuthorEditor (author) {
    const { editor } = this
    if (author) {
      const nameInput = 'js-name-input'

      const { name } = author
      const html = `
        <input class="${nameInput}" type="text" value="${name}">
      `

      editor.innerHTML = html
      const input = document.querySelector('.' + nameInput)
      Object.assign(this, { nameInput: input })

      this.renderSubmitButton()
    } else {
      editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }

  /**
   * Renders the collection editor for a collection
   * @param {Row} collection
   */
  renderCollectionEditor (collection) {
    const { editor } = this
    if (collection) {
      const nameInput = 'js-name-input'

      const { name } = collection
      const html = `
        <input class="${nameInput}" type="text" value="${name}">
      `

      editor.innerHTML = html
      const input = document.querySelector('.' + nameInput)
      Object.assign(this, { nameInput: input })

      this.renderSubmitButton()
    } else {
      editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }

  /**
   * Renders the submit data button at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = document.createElement('button')
    this.submitButton.className = this.submitClass
    this.submitButton.innerHTML = 'Submit'
    this.editor.appendChild(this.submitButton)
  }

  /**
   * Renders the element with the song authors
   */
  renderSongAuthors () {
    const { authors } = this
    this.authorsDiv = new MoveableRowsElement(
      authors,
      'authors-div',
      row => this.authorRowCallback(row)
    )

    this.authorsDiv.renderElement(this.editor)
  }

  /**
   * Renders the element with the song names
   */
  renderSongNames () {
    this.namesDiv = new MoveableRowsElement(
      this.names,
      'name-div',
      row => this.nameRowCallback(row)
    )
    console.log(this.namesDiv)

    this.namesDiv.renderElement(this.editor)
  }

  /**
   * Renders the element with the youtube link input
   */
  renderLinkInput () {
    const { editor, link } = this

    const linkInput = document.createElement('input')
    linkInput.className = 'link-input'
    linkInput.value = link

    editor.appendChild(linkInput)
    Object.assign(this, { linkInput })
  }

  /**
   * Renders the element with the HQ source checkboxes
   */
  renderFileCheckmarks () {
    const { files, editor } = this
    const filesDiv = document.createElement('div')

    files.forEach(file => {
      const checkProperty = file.is_hq ? 'checked' : ''
      const fileDiv = document.createElement('div')
      fileDiv.innerHTML = `
        ${file.original_name}
        ${this.generateFileAudio(file)}
        <input class="file-hq-check" type="checkbox" ${checkProperty} data-id="${file.file_id}">
      `
      filesDiv.appendChild(fileDiv)
    })

    editor.appendChild(filesDiv)
    Object.assign(this, { filesDiv })
  }

  /**
   * Generates HTML for an audio element based on a file
   * @param {Row} file
   * @returns {string}
   */
  generateFileAudio (file) {
    const name = file.original_name
    const extension = name.match(/\.(.*?)$/)[1]
    const validExtensions = [
      'mp3',
      'wav',
      'flac',
      'm4a',
      'ogg'
    ]
    if (validExtensions.includes(extension)) {
      return `
        <audio src="../music/${file.file_name}" controls></audio>
      `
    }
    return ''
  }

  /**
   * Get the row data from an author row in the database
   * @param {object} author
   * @param {string} author.Name
   * @param {object} author.dataset - Each key is a data variable name and its value
   * @returns {RowData}
   */
  authorRowCallback (author) {
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
  nameRowCallback (row) {
    return { value: row }
  }
}

class Controller {
  constructor (model, view) {
    const submitBlocker = new Blocker()

    Object.assign(this, { model, view, submitBlocker })
  }

  async initializePage () {
    const { model, view } = this
    const { type, id } = model
    switch (type) {
      case '0': {
        const song = await model.getSong()
        const authorInfo = await model.getAuthorNames('')
        const files = await model.getFileData()
        view.renderSongEditor(song, authorInfo, files)
        this.setupSubmitSong()
        view.namesDiv.setupRows('')
        view.authorsDiv.setupRows({ author_id: '', name: '' }, obj => this.setupAuthorQuery(obj), () => this.submitBlocker.block('authorId'))
        this.setupLinkControls()
        break
      }
      case '1': {
        const author = await model.getAuthor()
        view.renderAuthorEditor(author)
        this.setupSubmitAuthor()
        break
      }
      case '2': {
        view.renderCollectionEditor(id)
        this.setupSubmitCollection()
        break
      }
      default: {
        view.editor.innerHTML = 'ERROR'
        break
      }
    }
  }

  /**
   * Sets up the submit button for the song editor
   */
  setupSubmitSong () {
    this.setupSubmitButton('api/submit-data', () => this.getSongData())
  }

  /**
   * Sets up the submit button for the author editor
   */
  setupSubmitAuthor () {
    this.setupSubmitButton('api/submit-author', () => this.getAuthorData())
  }

  /**
   * Sets up the submit button for the collection editor
   */
  setupSubmitCollection () {
    this.setupSubmitButton('api/submit-collection', () => this.getCollectionData())
  }

  /**
   * Sets up the submit button controls
   * @param {string} route - Route to push the data to
   * @param {function() : object} dataFunction - Function that returns the data to be sent
   */
  setupSubmitButton (route, dataFunction) {
    const { submitBlocker, view } = this
    const { submitButton } = view

    submitBlocker.button = submitButton
    submitBlocker.clickCallback = () => {
      const data = dataFunction()
      postJSON(route, data)
    }
    submitBlocker.addListeners()
  }

  /**
   * Setup controls for the youtube link input
   */
  setupLink () {
    const blockVar = 'link'

    const blockToggle = () => {
      if (!isValidLink(this.view.linkInput.value)) this.submitBlocker.block(blockVar)
      else this.submitBlocker.unblock(blockVar)
    }

    this.view.linkInput.addEventListener('input', blockToggle)
  }

  /**
   * Gathers all the user data into a single song object to be sent to the database
   * @returns {Song}
   */
  getSongData () {
    const { view, model } = this
    const { id } = model
    const { namesDiv, authorsDiv, linkInput } = view

    // author ids are saved as data variables in inputs
    const names = this.collectInputData(namesDiv.rowsDiv, false)
    const authors = this.collectInputData(authorsDiv.rowsDiv, true, 'authorId')
    const link = linkInput.value
    const files = this.collectHQCheckData()

    const data = { songId: id, names, authors, link, files }

    return data
  }

  /**
   * Helper method thatreturns an ordered list of all the values
   * within inputs located inside an element
   *
   * The value extract can be either the .value property or a datavariable, if isDataset is true, to which case dataProperty is the data variable name
   * @param {HTMLElement} parent
   * @param {boolean} isDataset
   * @param {string} dataProperty
   * @returns {string[]}
   */
  collectInputData (parent, isDataset, dataProperty) {
    const mapFunction = isDataset
      ? input => input.dataset[dataProperty]
      : input => input.value
    console.log(parent)
    return [...parent.querySelectorAll('input')].map(mapFunction)
  }

  /**
   * Gets the HQ source information for the song files from the user data
   * @returns {Files}
   */
  collectHQCheckData () {
    const files = {}
    const fileChecks = this.view.filesDiv.querySelectorAll('input')
    fileChecks.forEach(checkbox => {
      const fileId = checkbox.dataset.id
      files[fileId] = checkbox.checked
    })

    return files
  }

  /**
   * Gets the user inputed author data to send to the database
   * @returns {Row}
   */
  getAuthorData () {
    const { view } = this
    const { nameInput } = view
    console.log(nameInput)
    const name = nameInput.value
    const data = { authorId: this.model.id, name }
    console.log(data)

    return data
  }

  /**
   * Gets the user inputed collection data to send to the database
   * @returns {Row}
   */
  getCollectionData () {
    const { view } = this
    const { nameInput } = view
    const name = nameInput.value
    const data = { collectionId: this.model.id, name }

    return data
  }

  /**
   * Get all the authors that have been picked by the user
   * for the current song
   * @returns {import('./query-options.js').TakenInfo}
   */
  getAllTakenAuthors () {
    const { view } = this
    const { authorsDiv } = view
    const allInputs = authorsDiv.rowsDiv.querySelectorAll('input')
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

  /**
   * Callback which adds the search queries to the authors
   * @param {MoveableRowsElement} moveableRows
   */
  setupAuthorQuery (moveableRows) {
    const input = moveableRows.rowsDiv.querySelector('.' + moveableRows.inputClass)
    createSearchQuery(
      input,
      'authorId',
      'author_id',
      'name',
      this.getAuthorNames,
      () => this.getAllTakenAuthors(),
      this.submitBlocker
    )
  }

  /**
   * Gets all authors in the database filtering name by a keyword
   * @param {string} keyword
   * @returns {Row[]}
   */
  async getAuthorNames (keyword) {
    const rows = await postAndGetJSON('api/get-author-names', { keyword })
    return rows
  }
}

class MoveableRowsElement {
  constructor (rows, divClass, rowCallback) {
    this.rowCallback = rowCallback

    this.rowClass = 'moveable-row'
    this.delClass = 'del-button'
    this.moveClass = 'move-button'
    this.inputClass = 'row-input'
    const addClass = 'add-button'

    this.rowsDiv = document.createElement('div')
    this.rowsDiv.className = divClass

    let html = ''
    rows.forEach(row => {
      const rowData = rowCallback(row)
      html += `<div class=${this.rowClass}>${this.generateRow(rowData)}</div>`
    })

    this.rowsDiv.innerHTML = html + `
    <button class="${addClass}">
      ADD
    </button>
    `

    this.addButton = this.rowsDiv.querySelector('.' + addClass)
  }

  /**
   * Append the element to a parent one
   * @param {HTMLElement} parent
   */
  renderElement (parent) {
    parent.appendChild(this.rowsDiv)
  }

  /**
   * Generates the HTML for a row
   * @param {RowData} rowData
   * @returns {string}
   */
  generateRow (rowData) {
    let dataset = ''
    for (const data in rowData.dataset) {
      dataset += `data-${data}="${rowData.dataset[data]}"`
    }

    return `
      <input class="${this.inputClass}" type="text" value="${rowData.value}"${dataset}">
      <button class="${this.delClass}"> X </button>
      <button class="${this.moveClass}"> M </button>
    `
  }

  /**
   * Setup the control to everything in the div
   * @param {*} defaultValue Default value for the row data
   * @param {function(MoveableRowsElement) : void} controlCallback Function to run after adding control to a row
   * @param {function() : void} clickCallback Extra function to run after clicking
   */
  setupControls (defaultValue, controlCallback, clickCallback) {
    this.controlCallback = controlCallback
    this.clickCallback = clickCallback
    this.setupRows()
    this.setupAddButton(defaultValue)
  }

  /**
   * Adds control to all the current moveable rows
   */
  setupRows () {
    const rows = this.rowsDiv.querySelectorAll('.' + this.rowClass)

    rows.forEach(row => {
      this.setupRow(row)
    })

    // to move rows
    this.rowsDiv.addEventListener('mouseup', () => {
      if (this.rowsDiv.dataset.isMoving) {
        this.rowsDiv.dataset.isMoving = ''
        const destination = Number(this.rowsDiv.dataset.hoveringRow)
        const origin = Number(this.rowsDiv.dataset.currentRow)

        // don't move if trying to move on itself
        if (destination !== origin) {
          // offset is to possibly compensate for indexes being displaced
          // post deletion
          const offset = destination > origin ? 1 : 0
          const originElement = this.rowsDiv.children[origin]
          const targetElement = this.rowsDiv.children[destination + offset]
          this.rowsDiv.removeChild(originElement)
          this.rowsDiv.insertBefore(originElement, targetElement)
        }
      }
    })
  }

  /**
   * Adds control to the add row button
   * @param {*} blankRow "Default value" argument of the rowCallback
   */
  setupAddButton (blankRow) {
    console.log(this.addButton)
    this.addButton.addEventListener('click', () => {
      const newRow = document.createElement('div')
      newRow.classList.add(this.rowClass)
      newRow.innerHTML = this.generateRow(this.rowCallback(blankRow))
      this.setupRow(newRow)
      this.addButton.parentElement.insertBefore(newRow, this.addButton)
      if (this.clickCallback) {
        this.clickCallback()
        this.clickCallback = null
      }
    })
  }

  /**
   * Adds control to a moveable row
   * @param {HTMLDivElement} row
   */
  setupRow (row) {
    const deleteButton = row.querySelector('.' + this.delClass)
    deleteButton.addEventListener('click', () => {
      this.rowsDiv.removeChild(row)
    })

    const moveButton = row.querySelector('.' + this.moveClass)

    // start dragging
    moveButton.addEventListener('mousedown', () => {
      const index = indexOfChild(this.rowsDiv, row)
      this.rowsDiv.dataset.currentRow = index
      this.rowsDiv.dataset.isMoving = '1'
    })

    // hover listener
    row.addEventListener('mouseover', () => {
      const index = indexOfChild(this.rowsDiv, row)
      this.rowsDiv.dataset.hoveringRow = index
    })

    if (this.controlCallback) {
      this.controlCallback(this)
      this.controlCallback = null
    }
  }
}

const model = new Model()
const view = new View()
const controller = new Controller(model, view)
controller.initializePage()

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
