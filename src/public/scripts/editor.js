import { selectElement, selectElements, createElement, postAndGetJSON, postJSON } from './utils.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'
import { DatabaseModel } from './database-model.js'

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

class Model extends DatabaseModel {
  constructor () {
    super()
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
    this.editor = selectElement('js-editor')
  }

  /**
   * Renders the song editor for a specific song
   * @param {Song} song - Song object
   * @param {Row[]} authorInfo - All the authors in the database
   * @param {Row[]} files -
   */
  renderSongEditor (song, authorInfo, files) {
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
      this.renderFileCheckboxes()
      this.renderMediaEditor()
      this.renderSubmitButton()
    } else {
      this.editor.innerHTML = 'NO SONG FOUND'
    }
  }

  /**
   * Renders the author editor for an author
   * @param {Row} author
   */
  renderAuthorEditor (author) {
    if (author) {
      const { name } = author
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      this.editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }

  /**
   * Renders the collection editor for a collection
   * @param {Row} collection
   */
  renderCollectionEditor (collection) {
    const { editor } = this
    if (collection) {
      const { name } = collection
      this.nameInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: name })
      this.renderSubmitButton()
    } else {
      editor.innerHTML = 'NO AUTHOR FOUND'
    }
  }

  /**
   * Renders the submit data button at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }

  /**
   * Renders the element with the song authors
   */
  renderSongAuthors () {
    this.authorsDiv = new MoveableRowsElement(
      'authors-div',
      this.authors,
      row => this.authorRowCallback(row)
    )

    this.renderHeader('Authors')
    this.authorsDiv.renderElement(this.editor)
  }

  /**
   * Renders the element with the song names
   */
  renderSongNames () {
    this.namesDiv = new MoveableRowsElement(
      'name-div',
      this.names,
      row => this.nameRowCallback(row)
    )

    this.renderHeader('Nuthors')
    this.namesDiv.renderElement(this.editor)
  }

  /**
   * Renders the element with the youtube link input
   */
  renderLinkInput () {
    this.renderHeader('Link')
    this.linkInput = createElement({ parent: this.editor, tag: 'input', type: 'text', value: this.link })
  }

  /**
   * Renders a song feature editor inside a media row
   * @param {HTMLDivElement} parent
   */
  renderSongFeature (parent) {
    createElement({ parent, tag: 'input', type: 'checkbox', checked: true })
    createElement({ parent })
  }

  /**
   * Render the feature date picker inside a feature editor
   * @param {HTMLDivElement} parent
   */
  renderFeatureDate (parent) {
    createElement({ parent, tag: 'input', type: 'date' })
    createElement({ parent, tag: 'input', type: 'checkbox' })
  }

  /**
   * Renders the element with the HQ source checkboxes
   */
  renderFileCheckboxes () {
    this.renderHeader('HQ Sources')
    this.filesDiv = createElement({ parent: this.editor, className: 'hq-sources' })

    this.files.forEach(file => {
      const checkProperty = file.is_hq ? 'checked' : ''
      const innerHTML = `
        <input class="file-hq-check" type="checkbox" ${checkProperty} data-id="${file.file_id}">
        ${file.original_name}
        ${this.generateFileAudio(file)}
      `
      createElement({ parent: this.filesDiv, className: 'hq-source', innerHTML })
    })
  }

  /**
   * Renders the media editor
   */
  renderMediaEditor () {
    this.renderHeader('medias')
    this.mediaRows = new OrderedRowsELement('media-rows', 'media-element')
    this.mediaRows.renderElement(this.editor)
  }

  renderHeader (name) {
    createElement({ parent: this.editor, innerHTML: name })
  }

  /**
   * Generates HTML for an audio element based on a file
   * @param {Row} file
   * @returns {string}
   */
  generateFileAudio (file) {
    const name = file.original_name
    let extension = name.match(/\.(.*?)$/)
    // in case there is no match
    if (extension) extension = extension[1]

    const validExtensions = [
      'mp3',
      'wav',
      'flac',
      'm4a',
      'ogg'
    ]

    if (extension && validExtensions.includes(extension)) {
      return `
        <audio src="../music/${file.file_name}" controls></audio>
      `
    }
    return '<div>Could not load</div>'
  }

  /**
   * Get the row data from an author row in the database
   * @param {object} author
   * @param {string} author.name
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
    this.submitBlocker = new Blocker()
    this.dateVar = 'dateBlock'

    Object.assign(this, { model, view })
  }

  async initializePage () {
    switch (this.model.type) {
      case '0': {
        const song = await this.model.getSong()
        const authorInfo = await this.model.getAuthorNames('')
        const files = await this.model.getFileData()
        this.view.renderSongEditor(song, authorInfo, files)
        this.setupSubmitSong()
        this.view.namesDiv.setupControls('')
        this.view.authorsDiv.setupControls({ author_id: '', name: '' },
          a => this.setupAuthorQuery(a),
          () => this.submitBlocker.block('authorId')
        )
        this.setupLink()
        this.setupMedias()
        break
      }
      case '1': {
        const author = await this.model.getAuthor()
        this.view.renderAuthorEditor(author)
        this.setupSubmitAuthor()
        break
      }
      case '2': {
        const collection = await this.model.getCollection()
        this.view.renderCollectionEditor(collection)
        this.setupSubmitCollection()
        break
      }
      default: {
        this.view.editor.innerHTML = 'ERROR'
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
    this.submitBlocker.button = this.view.submitButton
    this.submitBlocker.clickCallback = () => {
      const data = dataFunction()
      postJSON(route, data)
    }
    this.submitBlocker.addListeners()
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
   * Adds control to the media rows
   */
  setupMedias () {
    this.view.mediaRows.setupAddRow(
      'mediaId',
      'media_id',
      'name',
      a => this.model.getMediaNames(a),
      parent => {
        const featureRows = new OrderedRowsELement('feature-row', 'feature-element')
        featureRows.renderElement(parent)

        featureRows.setupAddRow(
          'featureId',
          'feature_id',
          'name',
          a => this.model.getFeatureNames(a),
          parent => {
            const rowContent = createElement({ parent })
            this.view.renderSongFeature(rowContent)
            this.setupSongFeature(rowContent)
          },
          featureRows => this.addRowCallback(featureRows, 'featureBlock')
        )

        return featureRows.div
      },
      mediaRows => this.addRowCallback(mediaRows, 'mediaBlock')
    )
  }

  /**
   * Adds controls to the feature editor inside a media row
   * @param {HTMLDivElement} parent
   */
  setupSongFeature (parent) {
    const checkbox = parent.querySelector('input')
    const innerDiv = parent.querySelector('div')
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        innerDiv.innerHTML = ''
        this.submitBlocker.unblock(this.dateVar)
        this.submitBlocker.removeBlockedClass(parent)
      } else {
        this.view.renderFeatureDate(innerDiv)
        this.submitBlocker.block(this.dateVar)
        this.submitBlocker.addBlockedClass(parent)
        this.setupFeatureDate(innerDiv)
      }
    })
  }

  /**
   * Adds control to the date picker inside a feature editor in a media row
   * @param {HTMLDivElement} parent
   */
  setupFeatureDate (parent) {
    const checkbox = parent.querySelector('input')
    checkbox.addEventListener('change', () => {
      if (checkbox.value === '') {
        this.submitBlocker.block(this.dateVar)
        this.submitBlocker.addBlockedClass(parent.parentElement)
      } else {
        this.submitBlocker.unblock(this.dateVar)
        this.submitBlocker.removeBlockedClass(parent.parentElement)
      }
    })
  }

  /**
   * Base function for the addCallback to run
   * in the ordered rows which block/unblock the submit button
   * @param {OrderedRowsELement} orderedRows
   * @param {string} variable - Blocking variable
   */
  addRowCallback (orderedRows, variable) {
    const headers = orderedRows.div.querySelectorAll(`.${orderedRows.headerClass}.${orderedRows.identifierClass}`)
    if (headers.length === 0) {
      this.submitBlocker.block(variable)
      this.submitBlocker.addBlockedClass(orderedRows.div)
    } else {
      this.submitBlocker.unblock(variable)
      this.submitBlocker.removeBlockedClass(orderedRows.div)
    }
  }

  /**
   * Gathers all the user data into a single song object to be sent to the database
   * @returns {Song}
   */
  getSongData () {
    // author ids are saved as data variables in inputs
    const names = this.collectInputData(this.view.namesDiv.rowsDiv, false)
    const authors = this.collectInputData(this.view.authorsDiv.rowsDiv, true, 'authorId')
    const link = this.view.linkInput.value
    const files = this.collectHQCheckData()

    return { songId: this.model.id, names, authors, link, files }
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
    return { authorId: this.model.id, name: this.view.nameInput.value }
  }

  /**
   * Gets the user inputed collection data to send to the database
   * @returns {Row}
   */
  getCollectionData () {
    return { collectionId: this.model.id, name: this.view.nameInput.value }
  }

  /**
   * Get all the authors that have been picked by the user
   * for the current song
   * @returns {import('./query-options.js').TakenInfo}
   */
  getAllTakenAuthors () {
    const allInputs = this.view.authorsDiv.rowsDiv.querySelectorAll('input')
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
    const input = selectElement(moveableRows.inputClass, moveableRows.rowsDiv)
    createSearchQuery(
      input,
      'authorId',
      'author_id',
      'name',
      a => this.model.getAuthorNames(a),
      () => this.getAllTakenAuthors(),
      this.submitBlocker
    )
  }
}

class MoveableRowsElement {
  /**
   * Creates the element
   *
   * The data is used with rows and rowCallback, rows is an arbitrary data type that is handled
   * by a specific rowCallback that transforms it into a RowData object
   * @param {string} divClass - CSS class for the element
   * @param {*} rows
   * @param {function(*) : RowData} rowCallback
   */
  constructor (divClass, rows, rowCallback) {
    this.rowCallback = rowCallback

    this.rowClass = 'moveable-row'
    this.delClass = 'del-button'
    this.moveClass = 'move-button'
    this.inputClass = 'row-input'

    let innerHTML = ''
    rows.forEach(row => {
      const rowData = rowCallback(row)
      innerHTML += `<div class=${this.rowClass}>${this.generateRow(rowData)}</div>`
    })

    this.rowsDiv = createElement({ className: divClass, innerHTML })
    this.addButton = createElement({ parent: this.rowsDiv, tag: 'button', innerHTML: 'ADD' })
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
      <input class="${this.inputClass}" type="text" value="${rowData.value}" ${dataset}>
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
    this.defaultValue = defaultValue
    this.setupRows()
    this.setupAddButton()
  }

  /**
   * Adds control to all the current moveable rows
   */
  setupRows () {
    const rows = selectElements(this.rowClass, this.rowsDiv)

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
   */
  setupAddButton () {
    this.addButton.addEventListener('click', () => {
      const innerHTML = this.generateRow(this.rowCallback(this.defaultValue))
      const newRow = createElement({ className: this.rowClass, innerHTML })
      this.addButton.parentElement.insertBefore(newRow, this.addButton)
      this.setupRow(newRow)

      if (this.clickCallback) this.clickCallback()
    })
  }

  /**
   * Adds control to a moveable row
   * @param {HTMLDivElement} row
   */
  setupRow (row) {
    // delete row
    selectElement(this.delClass, row).addEventListener('click', () => {
      this.rowsDiv.removeChild(row)
    })

    // start dragging
    selectElement(this.moveClass, row).addEventListener('mousedown', () => {
      const index = indexOfChild(this.rowsDiv, row)
      this.rowsDiv.dataset.currentRow = index
      this.rowsDiv.dataset.isMoving = '1'
    })

    // hover listener
    row.addEventListener('mouseover', () => {
      const index = indexOfChild(this.rowsDiv, row)
      this.rowsDiv.dataset.hoveringRow = index
    })

    if (this.controlCallback) this.controlCallback(this)
  }
}

class OrderedRowsELement {
  /**
   * Creates the element using divClass as the element class,
   * and idClass are assigned to all row headers
   * @param {string} divClass
   * @param {string} idClass
   */
  constructor (divClass, idClass) {
    this.rowClass = 'ordered-row'
    this.headerClass = 'row-header'
    this.identifierClass = idClass

    this.div = createElement({ className: divClass })
    this.newRowDiv = createElement({ parent: this.div })
    this.addButton = createElement({ parent: this.newRowDiv, tag: 'button', innerHTML: 'ADD' })
    this.addInput = createElement({ parent: this.newRowDiv, tag: 'input' })
  }

  /**
   * Appends the ordered rows element to a parent element
   * @param {HTMLElement} parent
   */
  renderElement (parent) {
    parent.appendChild(this.div)
  }

  /**
   * Adds control to the add row button
   *
   * The first four arguments are related to the arguments for the search query
   * @param {string} dataVar
   * @param {string} databaseVar
   * @param {string} databaseValue
   * @param {function(string) : Row} fetchDataFunction
   *
   * @param {function(HTMLDivElement) : void} contentFunction - A function that adds to the given div argument the element that will be displayed next to the header
   * @param {function(OrderedRowsELement) : void} addCallback - A function to row every time a row is added (also runs when the element is created)
   */
  setupAddRow (
    dataVar,
    databaseVar,
    databaseValue,
    fetchDataFunction,
    contentFunction,
    addCallback
  ) {
    this.dataVar = dataVar
    if (addCallback) addCallback(this)

    this.addBlocker = new Blocker(this.addButton, () => {
      const mediaId = this.addInput.dataset.mediaId
      const mediaName = this.addInput.value

      // reset input
      this.addBlocker.block(dataVar)
      this.addBlocker.addBlockedClass(this.addInput)
      this.addInput.value = ''
      this.addInput.dataset.mediaId = ''

      const rowHTML = `
        <div class="${this.headerClass} ${this.identifierClass}" data-media-id="${mediaId}"> ${mediaName} </div>
      `
      const newRow = createElement({ className: this.rowClass, innerHTML: rowHTML })
      this.div.insertBefore(newRow, this.newRowDiv)

      const contentDiv = createElement({ parent: newRow })
      contentFunction(contentDiv)

      if (addCallback) addCallback(this)
    })

    this.addBlocker.block(dataVar)
    this.addBlocker.addBlockedClass(this.addInput)

    createSearchQuery(
      this.addInput,
      dataVar,
      databaseVar,
      databaseValue,
      fetchDataFunction,
      a => this.checkTakenIds(a),
      this.addBlocker
    )
  }

  /**
   * Function that checkds which of the ids are taken for the query
   * @param {HTMLInputElement} input
   * @returns {import('./query-options.js').TakenInfo}
   */
  checkTakenIds (input) {
    const id = input.dataset[this.dataVar]
    const headers = this.div.querySelectorAll(`.${this.headerClass}.${this.identifierClass}`)

    const takenIds = []
    let hasUntakenId = false

    const check = id => {
      if (id) takenIds.push(id)
      else hasUntakenId = true
    }

    check(id)

    headers.forEach(header => {
      const id = header.dataset[this.dataVar]
      check(id)
    })

    return { hasUntakenId, takenIds }
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
