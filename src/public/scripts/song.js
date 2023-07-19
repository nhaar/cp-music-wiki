import { EditorModel, EditorView, EditorController, EditorType } from './editor-class.js'
import { generateAudio } from './file.js'
import { createSearchQuery } from './query-options.js'
import { Blocker } from './submit-block.js'
import { createElement, findInObject, postAndGetJSON, selectElement, selectElements } from './utils.js'

/**
 * Data structure for a song
 * @typedef {object} SongData
 * @property {string} songId
 * @property {Name[]} names
 * @property {SongAuthor[]} authors
 * @property {Files} files
 * @property {Medias}
 * @property {UnofficialNames[]} unNames
 */

/**
 * @typedef {object} Name
 * @property {string} name
 * @property {string} referenceId
 * @property {LocalizationName} pt
 * @property {LocalizationName} fr
 * @property {LocalizationName} es
 * @property {LocalizationName} de
 * @property {LocalizationName} ru
 */

/**
 * @typedef {object} LocalizationName
 * @property {string} name
 * @property {string} referenceId
 * @property {string} translationNotes
 */

/**
 * @typedef {object} SongAuthor
 * @property {number} authorId
 * @property {string} referenceId
 */

/**
 * Each property is a file id and it maps to a boolean representing whether or not
 * it is a high quality source
 * @typedef {object} Files
 */

/**
 * Each property is a media id and it maps to a Features object
 * @typedef {object} Medias
 */

/**
 * Each property is a feature id and it maps to a Feature object
 * @typedef {object} Features
 */

/**
 * Data for a feature
 * @typedef {object} Feature
 * @property {boolean} releaseDate
 * @property {string} date
 * @property {boolean} isEstimate
 */

/**
 * Object used for storing data for a moveable row
 * @typedef {object} RowData
 * @property {string} value
 * @property {object} dataset
 */

/**
 * Object that maps an id onto a row
 * @typedef {object} IdMap
 */

class SongModel extends EditorModel {
  constructor () {
    super('song', { names: [], authors: [] })
  }

  /**
   * Gets the music files data for a song
   * @returns {Row[]}
   */
  async getFileData () {
    if (this.id) {
      const rows = await postAndGetJSON('api/get-file-data', { songId: this.id })
      return rows
    } else {
      return []
    }
  }
}

class SongView extends EditorView {
  constructor () {
    super('song-editor')
    this.expandClass = 'expand-button'
    this.nameDivs = {}
  }

  /**
   * Song buildEditor
   * @param {object} data
   * @param {SongData} data.song - The editted song
   * @param {Row[]} data.authorInfo - All the authors in the database
   * @param {Row[]} data.files - All the files belonging to this song
   */
  buildEditor (data) {
    const { song, authorMap, referenceMap, files } = data

    if (song) {
      // set up template rows
      let gridTemplateRows = ''
      for (let i = 0; i < 2; i++) gridTemplateRows += '1fr '
      gridTemplateRows += '50px '
      for (let i = 0; i < 2; i++) gridTemplateRows += '1fr '
      this.editor.style.gridTemplateRows = gridTemplateRows

      const { names, authors, link } = song

      // filter and order author names

      Object.assign(this, { names, authors, link, files, song })

      this.renderNamesDiv(referenceMap)
      this.renderAuthors(authorMap, referenceMap)
      this.renderLink()
      this.renderFiles()
      this.renderMedia()
    } else {
      this.editor.innerHTML = 'NO SONG FOUND'
    }
  }

  renderRow (name, callback) {
    this.renderHeader(name)

    const wrapper = createElement({ parent: this.editor })
    createElement({ parent: wrapper, tag: 'button', innerHTML: 'expand', className: this.expandClass })
    callback(wrapper)
  }

  /**
   * Render the moveable rows for the main names
   * @param {object} references - Object that maps reference ids to reference database rows, used to get the reference name
   */
  renderNamesDiv (references) {
    this.langDiv = 'lang-div'

    const langCodes = {
      pt: 'Portuguese Names',
      fr: 'French Names',
      es: 'Spanish Names',
      de: 'German Names',
      ru: 'Russian Names'
    }

    this.renderRow('Names', wrapper => {
      const rowGenerator = row => {
        let referenceName = ''
        let referenceId = ''
        if (row.referenceId) {
          referenceId = row.referenceId
          referenceName = references[referenceId].name
        }
        let html = `
            <div>
              <input value="${row.name}">
              <input value="${referenceName}" data-reference-id="${referenceId}">
            </div>
            <div>
              <select>
                <option selected> [PICK LOCALIZATION] </option>
                <option value="pt"> Portuguese </option>
                <option value="fr"> French </option>
                <option value="es"> Spanish </option>
                <option value="de"> German </option>
                <option value="ru"> Russian </option>
              </select>
            </div>
            
          `

        html += '<div>'
        for (const code in langCodes) {
          console.log(code)
          let name = ''
          let referenceName = ''
          let referenceId = ''
          let translationNotes = ''

          // avoid breaking on new rows
          if (row[code]) {
            name = row[code].name
            referenceId = row[code].referenceId
            translationNotes = row[code].translationNotes
          }

          if (references[referenceId]) referenceName = references[referenceId].name

          html += `
              <div class="hidden ${this.langDiv}">
                <input value="${name}">  
                <input value="${referenceName}" data-reference-id="${referenceId}">
                <textarea>${translationNotes}</textarea>
              </div>
            `
        }
        html += '</div>'

        return html
      }
      this.namesDiv = new MoveableRowsElement(
        'name-div',
        this.song.names,
        rowGenerator
      )

      this.namesDiv.renderElement(wrapper)
    })
  }

  /**
   * Renders the element with the song authors
   * @param {IdMap} authorMap
   * @param {IdMap} referenceMap
   */
  renderAuthors (authorMap, referenceMap) {
    this.renderRow('Authors', wrapper => {
      this.authorsDiv = new MoveableRowsElement(
        'authors-div',
        this.authors,
        row => {
          let referenceName = ''
          let referenceId = ''
          console.log(referenceMap)
          if (row.referenceId) {
            referenceId = row.referenceId
            referenceName = referenceMap[referenceId].name
          }
          let authorId = ''
          let authorName = ''
          console.log(authorMap)
          if (row.authorId) {
            authorId = row.authorId
            authorName = authorMap[authorId].name
          }

          return `
            <input value="${authorName}" data-author-id="${authorId}">
            <input value="${referenceName}" data-reference-id="${referenceId}">
          `
        }
      )

      this.authorsDiv.renderElement(wrapper)
    })
  }

  /**
   * Renders the element with the youtube link input
   */
  renderLink () {
    this.renderRow('Link', wrapper => {
      this.linkInput = createElement({ parent: wrapper, tag: 'input', type: 'text', value: this.link })
    })
  }

  /**
   * Renders the element with the HQ source checkboxes
   */
  renderFiles () {
    this.renderRow('HQ Sources', wrapper => {
      this.filesDiv = createElement({ parent: wrapper, className: 'hq-sources' })

      this.files.forEach(file => {
        const checkProperty = file.is_hq ? 'checked' : ''
        const innerHTML = `
          <input class="file-hq-check" type="checkbox" ${checkProperty} data-id="${file.file_id}">
          <div>${file.original_name}</div>
          <div>${generateAudio(file)}</div>
        `
        createElement({ parent: this.filesDiv, className: 'hq-source', innerHTML })
      })
    })
  }

  /**
   * Renders the media editor
   */
  renderMedia () {
    this.renderRow('Medias', wrapper => {
      this.mediaRows = new OrderedRowsELement('media-rows', 'media-element')
      this.mediaRows.renderElement(wrapper)
    })
  }

  /**
   * Renders a song feature editor inside a media row
   * @param {HTMLDivElement} parent
   */
  renderFeature (parent) {
    createElement({ parent, tag: 'input', type: 'checkbox', checked: true })
    createElement({ parent })
  }

  /**
   * Render the feature date picker inside a feature editor
   * @param {HTMLDivElement} parent
   */
  renderFeatureDate (parent) {
    parent.classList.add('feature-date')
    createElement({ parent, tag: 'input', type: 'date' })
    createElement({ parent, tag: 'input', type: 'checkbox' })
  }

  /**
   * Render the 'header' for a row
   * @param {string} name - Text inside the header
   */
  renderHeader (name) {
    createElement({ parent: this.editor, className: 'editor-header', innerHTML: name })
  }

  /**
   * Get the row data for a name
   * @param {string} name
   * @returns {RowData}
   */
  nameRowCallback (row) {
    return { value: row }
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
}

class SongController extends EditorController {
  constructor (model, view) {
    super(model, view)

    /** Variable for blocking the date picker */
    this.dateVar = 'dateBlock'
  }

  /**
   * Song getBuildData
   * @returns {object}
   */
  async getBuildData () {
    const song = this.model.data
    this.song = song

    const referenceInfo = await this.model.getReferenceNames('')
    const referenceMap = rowsToIdMap(referenceInfo, 'reference_id')
    const authorNames = (await this.model.getAuthorNames(''))
    const authorMap = rowsToIdMap(authorNames, 'author_id')

    const files = await this.model.getFileData()
    this.mediaNames = await this.model.getMediaNames('')
    this.featureNames = await this.model.getFeatureNames('')

    return { song, authorMap, referenceMap, files }
  }

  /**
   * Song setupEditor
   */
  async setupEditor () {
    // setting up name rows
    this.view.namesDiv.setupControls(
      { name: '' },
      row => {
        const mainReference = row.children[0].children[0].children[1]
        const otherReferences = row.children[0].children[2].querySelectorAll(`.${this.view.langDiv} input:nth-child(2)`)
        const references = [mainReference, ...otherReferences]
        references.forEach(input => {
          createSearchQuery(
            input,
            'referenceId',
            'reference_id',
            'name',
            x => this.model.getReferenceNames(x)
          )
        })
        const select = row.querySelector('select')
        select.addEventListener('change', () => {
          const targetElement = {
            pt: 0,
            fr: 1,
            es: 2,
            de: 3,
            ru: 4
          }[select.value]
          const previousElement = row.querySelector(`.${this.view.langDiv}:not(.hidden)`)
          if (previousElement) previousElement.classList.add('hidden')
          if (targetElement !== undefined) row.children[0].children[2].children[targetElement].classList.remove('hidden')
        })
      }
    )

    // author controls
    this.view.authorsDiv.setupControls({ authorId: '' },
      a => this.setupAuthorQuery(a),
      () => this.submitBlocker.block('authorId'),
      obj => {
        // it ends up becoming button for some reason
        if (selectElement(this.submitBlocker.blockedClass, obj.div).tagName === 'BUTTON') {
          this.submitBlocker.unblock('authorId')
        }
      }
    )
    this.setupLink()
    this.setupMedias()
    this.updateMediasRow()
    this.setupExpand()
  }

  setupExpand () {
    const expandButtons = selectElements(this.view.expandClass)
    const currentStyle = this.view.editor.style.gridTemplateRows
    const rowStyles = currentStyle.split(' ')

    expandButtons.forEach((button, i) => {
      const targetElement = button.parentElement.children[1]
      const hide = () => {
        this.swapTemplateRow(i + 1, '50px')
        targetElement.classList.add('hidden-btn')
      }
      hide()
      button.addEventListener('click', () => {
        if (targetElement.classList.contains('hidden-btn')) {
          targetElement.classList.remove('hidden-btn')
          this.swapTemplateRow(i + 1, rowStyles[i])
          button.classList.add('hidden-btn')
        } else {
          hide()
        }
      })
    })
  }

  swapTemplateRow (number, replacement) {
    let currentNumber = 1
    let foundStart = false
    let start
    let end
    const currentStyle = this.view.editor.style.gridTemplateRows
    for (let i = 0; i < currentStyle.length; i++) {
      const char = currentStyle[i]
      if (char === ' ') currentNumber++
      if (currentNumber === number && !foundStart) { foundStart = true; start = i }
      if (currentNumber !== number && foundStart) { end = i; break }
      if (i === currentStyle.length - 1 && foundStart) { end = currentStyle.length }
    }
    const targetStyle = currentStyle.slice(0, start) + ' ' + replacement + currentStyle.slice(end, currentStyle.length)
    this.view.editor.style.gridTemplateRows = targetStyle
  }

  /**
   * Adds controls for the youtube link input
   */
  setupLink () {
    const blockVar = 'link'

    this.view.linkInput.addEventListener('input', () => {
      this.submitBlocker.ternaryBlock(
        !isValidLink(this.view.linkInput.value),
        blockVar, this.view.linkInput
      )
    })
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

        // save the featureRows variable to be read during page initialization
        if (!this.view.mediaRows.featureRows) this.view.mediaRows.featureRows = []
        this.view.mediaRows.featureRows.push(featureRows)
        featureRows.renderElement(parent)

        featureRows.setupAddRow(
          'featureId',
          'feature_id',
          'name',
          a => this.model.getFeatureInMedias(a, parent.parentElement.children[0].dataset.mediaId),
          parent => {
            const rowContent = createElement({ parent, className: 'feature-content' })
            this.view.renderFeature(rowContent)
            this.setupFeature(rowContent)
          },
          featureRows => this.addRowCallback(featureRows, 'featureBlock')
        )

        return featureRows.div
      }
    )
  }

  /**
   * Adds controls to the feature editor inside a media row
   * @param {HTMLDivElement} parent
   */
  setupFeature (parent) {
    const checkbox = parent.querySelector('input')
    const innerDiv = parent.querySelector('div')

    checkbox.addEventListener('change', () => {
      this.submitBlocker.ternaryBlock(
        !checkbox.checked,
        this.dateVar, parent,
        () => {
          this.view.renderFeatureDate(innerDiv)
          this.setupFeatureDate(innerDiv)
        },
        () => (innerDiv.innerHTML = '')
      )
    })
  }

  /**
   * Adds control to the date picker inside a feature editor in a media row
   * @param {HTMLDivElement} parent
   */
  setupFeatureDate (parent) {
    const checkbox = parent.querySelector('input')
    checkbox.addEventListener('change', () => {
      this.submitBlocker.ternaryBlock(
        checkbox.value === '',
        this.dateVar, parent.parentElement
      )
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

    this.submitBlocker.ternaryBlock(
      headers.length === 0,
      variable, orderedRows.div.children[0].children[0]
    )
  }

  /**
   * Song getUserData
   * @returns {SongData}
   */
  getUserData () {
    // author ids are saved as data variables in inputs
    const names = this.collectNameData()
    const authors = this.collectAuthorData(this.view.authorsDiv.rowsDiv, true, 'authorId')
    const link = this.view.linkInput.value
    const files = this.collectHQCheckData()
    const medias = this.collectMediaData()

    return { songId: this.model.id, names, authors, link, files, medias }
  }

  /**
   * Helper method that returns an ordered list of all the values
   * within inputs located inside an element
   *
   * The value extracted can be either the .value property or a datavariable, if isDataset is true, to which case dataProperty is the data variable name
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
   * Get the name data from the page
   * @returns {Name}
   */
  collectNameData () {
    const rows = selectElements(this.view.namesDiv.contentClass, this.view.namesDiv.rowsDiv)
    const names = []
    rows.forEach(row => {
      const mainDiv = row.children[0]

      const name = {
        name: mainDiv.children[0].value,
        referenceId: mainDiv.children[1].dataset.referenceId
      }

      const codes = ['pt', 'fr', 'es', 'de', 'ru']
      codes.forEach((code, i) => {
        const localizationDiv = row.children[2].children[i]
        const localizationName = {
          [code]: {
            name: localizationDiv.children[0].value,
            referenceId: localizationDiv.children[1].dataset.referenceId,
            translationNotes: localizationDiv.children[2].value
          }
        }

        Object.assign(name, localizationName)
      })

      names.push(name)
    })

    return names
  }

  /**
   * Collects the author data from the page
   * @returns {SongAuthor}
   */
  collectAuthorData () {
    const rowsDiv = this.view.authorsDiv.rowsDiv
    const authorInputs = rowsDiv.querySelectorAll('input:first-child')
    const referenceInputs = rowsDiv.querySelectorAll('input:nth-child(2)')
    const authors = []
    authorInputs.forEach((authorInput, i) => {
      authors.push({
        authorId: Number(authorInput.dataset.authorId),
        referenceId: Number(referenceInputs[i].dataset.referenceId) || null
      })
    })

    return authors
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
   * Gathers the page media data as a medias object
   * @returns {Medias}
   */
  collectMediaData () {
    const data = {}
    const mediaRows = this.view.mediaRows.getRows()
    mediaRows.forEach(mediaRow => {
      const mediaId = mediaRow.children[0].dataset.mediaId
      data[mediaId] = {}
      const featureRows = selectElements(this.view.mediaRows.rowClass, mediaRow.children[1])
      featureRows.forEach(featureRow => {
        const contentDiv = featureRow.children[1].children[0]

        const featureId = featureRow.children[0].dataset.featureId

        const releaseDate = contentDiv.children[0].checked
        let date
        let isEstimate

        if (!releaseDate) {
          const dateDiv = contentDiv.children[1]
          date = dateDiv.children[0].value
          isEstimate = dateDiv.children[1].checked
        }

        data[mediaId][featureId] = { releaseDate, date, isEstimate }
      })
    })

    return data
  }

  getAllTakenMoveableRow (elements, dataVar) {
    const takenIds = []
    let hasUntakenId = false
    elements.forEach(element => {
      const id = element.dataset[dataVar]
      if (id) takenIds.push(id)
      else hasUntakenId = true
    })

    return {
      takenIds,
      hasUntakenId
    }
  }

  /**
   * Get all the authors that have been picked by the user
   * @returns {import('./query-options.js').TakenInfo}
   */
  getAllTakenAuthors () {
    const allInputs = this.view.authorsDiv.rowsDiv.querySelectorAll('input:first-child')
    return this.getAllTakenMoveableRow(allInputs, 'authorId')
  }

  /**
   * Adds all the media information retrieved from the database
   * into the page
   */
  updateMediasRow () {
    const { medias } = this.song
    let currentMedia = 0
    for (const mediaId in medias) {
      const name = findInObject(this.mediaNames, 'media_id', Number(mediaId)).name
      this.view.mediaRows.createNewRow(name, mediaId)
      const featureRows = this.view.mediaRows.featureRows[currentMedia]
      let currentFeature = 0
      for (const featureId in medias[mediaId]) {
        const featureName = findInObject(this.featureNames, 'feature_id', Number(featureId)).name
        featureRows.createNewRow(featureName, featureId)
        const { releaseDate, date, isEstimate } = medias[mediaId][featureId]
        const featureElement = featureRows.getRows()[currentFeature]
        const contentDiv = featureElement.children[1].children[0]
        contentDiv.children[0].checked = releaseDate
        if (!releaseDate) {
          const dateDiv = contentDiv.children[1]
          this.view.renderFeatureDate(dateDiv)
          this.setupFeatureDate(dateDiv)
          dateDiv.children[0].value = date
          dateDiv.children[1].checked = isEstimate
        }
        currentFeature++
      }
      currentMedia++
    }
  }

  setupNameReferenceQuery (row) {
    const input = row.children[0].children[1]
    createSearchQuery(
      input,
      'referenceId',
      'reference_id',
      'name',
      a => this.model.getReferenceNames(a)
    )
  }

  /**
   * Callback which adds the search queries to the authors
   * @param {HTMLDivElement} - The element for the row inside the element
   */
  setupAuthorQuery (row) {
    const input = row.querySelector('input:first-child')
    const referenceInput = row.querySelector('input:nth-child(2)')
    createSearchQuery(
      input,
      'authorId',
      'author_id',
      'name',
      a => this.model.getAuthorNames(a),
      () => this.getAllTakenAuthors(),
      this.submitBlocker
    )

    createSearchQuery(
      referenceInput,
      'referenceId',
      'reference_id',
      'name',
      a => this.model.getReferenceNames(a)
    )
  }
}

export class Song extends EditorType {
  constructor (id) { super(id, SongModel, SongView, SongController) }
}

class MoveableRowsElement {
  /**
   * Creates the element
   *
   * The data is handled with rows and rowCallback, rows is an arbitrary data type that is handled
   * by a specific rowCallback that transforms it into a RowData object
   * @param {string} divClass - CSS class for the element
   * @param {*} rows
   */
  constructor (divClass, rows, rowGenerator) {
    this.rowGenerator = rowGenerator

    this.rowClass = 'moveable-row'
    this.delClass = 'del-button'
    this.moveClass = 'move-button'
    this.contentClass = 'row-content'

    let innerHTML = ''
    rows.forEach(row => {
      innerHTML += `<div class=${this.rowClass}>${this.generateRow(row)}</div>`
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
    return `
      <div class="${this.contentClass}">${this.rowGenerator(rowData)}</div>
      <button class="${this.delClass}"> DELETE </button>
      <button class="${this.moveClass}"> MOVE </button>
    `
  }

  /**
   * Setup the control to everything in the div
   * @param {*} defaultValue - Default value for the row data
   * @param {function(MoveableRowsElement) : void} controlCallback - Function to run after adding control to a row
   * @param {function() : void} clickCallback - Extra function to run after clicking the add button
   */
  setupControls (defaultValue, controlCallback, clickCallback, deleteCallback) {
    this.controlCallback = controlCallback
    this.clickCallback = clickCallback
    this.deleteCallback = deleteCallback
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
      const innerHTML = this.generateRow(this.defaultValue)
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
      if (this.deleteCallback) this.deleteCallback(this)
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
    if (this.controlCallback) this.controlCallback(row)
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
    this.newRowDiv = createElement({ parent: this.div, className: 'add-ordered-row' })
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
   * @param {function(OrderedRowsELement) : void} addCallback - A function to call every time a row is added (also runs when the element is created)
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
    this.contentFunction = contentFunction
    this.addCallback = addCallback

    if (addCallback) addCallback(this)

    this.addBlocker = new Blocker(this.addButton, () => this.createNewRow(this.addInput.value, this.addInput.dataset[dataVar]))

    this.addBlocker.blockElement(dataVar, this.addInput)

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
   * Creates a new row where the header is the name and adds the data variable as the id
   * @param {string} name
   * @param {string} id
   */
  createNewRow (name, id) {
    // reset input
    this.addBlocker.blockElement(this.dataVar, this.addInput)
    this.addInput.value = ''
    this.addInput.dataset[this.dataVar] = ''
    const newRow = createElement({ classes: [this.rowClass, this.identifierClass] })
    createElement({ parent: newRow, classes: [this.headerClass, this.identifierClass], dataset: { [this.dataVar]: id }, innerHTML: name })

    this.div.insertBefore(newRow, this.newRowDiv)

    const contentDiv = createElement({ parent: newRow })
    this.contentFunction(contentDiv)

    if (this.addCallback) this.addCallback(this)
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

  /**
   * Gives a string that can be used to select a row
   * @returns
   */
  getRowSelector () {
    return `.${this.rowClass}.${this.identifierClass}`
  }

  /**
   * Gets all the rows inside this element
   * @returns
   */
  getRows () {
    return this.div.querySelectorAll(this.getRowSelector())
  }
}

/**
 * Helper function that checks if a link
 * is valid to submit to the database
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
 * Get a map of id -> row based of an array of rows
 * @param {import('../../app/database.js').Row[]} rows
 * @param {string} idName - Name of the id column/property
 * @returns {IdMap} Map of id -> row
 */
function rowsToIdMap (rows, idName) {
  const map = {}
  rows.forEach(row => {
    const id = row[idName]
    map[id] = row
  })

  return map
}
