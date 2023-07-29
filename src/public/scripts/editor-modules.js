import { createSearchQuery } from './query-options.js'
import { createElement, deepcopy, selectElement, selectElements, styleElement } from './utils.js'

/**
 * A pointer representation to a variable that isn't necessarily a reference
 *
 * It consists of using the pointer to a reference and reserving a property inside the object
 */
class Pointer {
  /**
   * Define pointer in object and property name
   * @param {object} reference - Reference to an object
   * @param {string} property - Name of a property to reserve
   */
  constructor (reference, property) {
    this.r = reference
    this.p = property
  }

  /**
    * Update the value the pointer points to
    * @param {*} value - Value to store in the pointer
    */
  assign (value) { this.r[this.p] = value }

  /**
   * Reads the value the pointer points to
   * @returns {*} Value stored in the pointer
   */
  read = () => this.r[this.p]

  /**
   * Copies the value from this pointer to another pointer
   * @param {Pointer} pointer Other pointer to pass value to
   */
  exchange (pointer) { pointer.assign(this.read()) }

  /**
   * Create a pointer using an object reference and the path to an element inside the object
   * @param {object} reference - Object reference to save
   * @param {string} path - A string representation of the path, for example, '.property[0][1].property'
   * @returns {Pointer} Result pointer
   */
  static fromPath (reference, path) {
    const steps = path.match(/\.\w+|\[.\]/g)
    let object = reference
    const removeDot = x => x.match(/[^.]+/)[0]
    const lastStep = removeDot(steps.splice(steps.length - 1, 1)[0])

    steps.forEach(step => {
      if (step.includes('.')) {
        const prop = removeDot(step)
        object = object[prop]
      } else if (step.includes('[')) {
        const i = Number(step.match(/\[(.*?)\]/)[1])
        object = object[i]
      }
    })

    return new Pointer(object, lastStep)
  }
}

/**
 * The base class for the modules
 *
 * It contains the four main methods as well as the base method for getting modules
 */
class BaseModule {
  /**
   * This function handles the children modules that are created with the module creation
   *
   * It iterates through all the preconfigured modules and generates the list of children following the creation rules
   * established by the options and the callback function
   * @param {object} options - Object that maps variable names to indexes of arrays. Each module is an array where each index represents a variable, dictated by this options object
   * @param {function(object) : BaseModule} callbackfn - Takes as the argument a vars object where each key is the name of an object with its value, and returns the constructed reference to the child
   * @returns {BaseModule[]} The array with all the children
   */
  iteratemodules (options, callbackfn) {
    const children = []
    this.modules().forEach(module => {
      const vars = {}
      for (const v in options) {
        vars[v] = module[options[v]]
      }
      if (!vars.args) vars.args = []
      if (vars.path) vars.path = Pointer.fromPath(this.r, vars.path)
      children.push(callbackfn(vars))
    })
    return children
  }

  /**
   * Placeholder method returning empty list
   * @returns {BaseModule[]} Empty list
   */
  getmodules () { return [] }

  /**
   * Placeholder method returning empty list
   * @returns {BaseModule[]} Empty list
   */
  modules () { return [] }

  /**
   * Method for rendering HTML elements
   */
  build () {
    if (this.prebuild) this.prebuild()
    this.iterateChildren('build')
    if (this.postbuild) this.postbuild()
  }

  /**
   * Method for inputting the data from database onto the page
   */
  input () {
    if (this.preinput) this.preinput()
    if (this.int) {
      if (this.convertinput) {
        this.int.assign(this.convertinput(this.out.read()))
      } else {
        this.out.exchange(this.int)
      }
    }
    this.iterateChildren('input')
  }

  /**
   * Method for adding control to the HTML elements
   */
  setup () {
    if (this.presetup) this.presetup()
    this.iterateChildren('setup')
  }

  /**
   * Method for outputting the data in the page to the backend
   */
  async output () {
    for (let i = 0; i < this.children.length; i++) {
      await this.children[i].output()
    }
    if (this.middleoutput) await this.middleoutput()
    if (this.postmidoutput) await this.postmidoutput()
    if (this.int) {
      if (this.convertoutput) {
        this.out.assign(this.convertoutput(this.int.read()))
      } else {
        this.int.exchange(this.out)
      }
    }
    if (this.postoutput) await this.postoutput()
  }

  /**
   * Helper method to iterate through all the children modules and call a function from them
   * @param {string} fn - Name of the function to call
   */
  iterateChildren (fn) { this.children.forEach(child => child[fn]()) }
}

/**
 * Base class for all the modules that are children of a parent
 */
class ChildModule extends BaseModule {
  /**
   * Create the module linked to a parent element and an external pointer,
   * as well as giving it an element if possible
   * @param {BaseModule} parent - Parent module to this module
   * @param {Pointer} out - External pointer
   * @param {HTMLElement} element - HTML element to link to this module, if missing will use the same element as the parent module
   */
  constructor (parent, out, element) {
    super()
    Object.assign(this, { parent, out })
    this.e = element || parent.e
    if (this.earlyinit) this.earlyinit()
    if (this.initialize) this.initialize()
    this.children = this.getmodules()
  }
}

/**
 * Class for modules that directly receive a reference from the database
 * and is at the top of the module tree
 */
class ReceptorModule extends BaseModule {
  /**
   * Link module to the main object and HTML element
   * @param {object} reference - Reference to main object retrieved from the database
   * @param {HTMLElement} element - The outtermost HTML element for the editor
   */
  constructor (reference, element) {
    super()
    this.r = reference
    this.e = element
    this.children = this.getmodules()
  }

  getmodules () {
    return this.iteratemodules({
      Class: 0,
      path: 1,
      args: 2
    }, o => new o.Class(this, o.path, null, ...o.args))
  }
}

/**
 * The class for the modules that serve only as a bridge for the data coming from the parent module to the children modules,
 * as such it contains no internal pointer
 */
class ConnectionModule extends ChildModule {
  getmodules () {
    return this.iteratemodules({
      Class: 0,
      args: 1
    }, o => new o.Class(this.parent, this.out, null, ...o.args))
  }
}

/**
 * Modules that handle array data, having an arbitrary number of modules all of the same type
 */
class ArrayModule extends ChildModule {
  /**
   *
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   * @param {Class} ChildClass - Constructor for the children module
   */
  constructor (parent, out, element, ChildClass) {
    super(parent, out, element)
    Object.assign(this, { ChildClass })
  }

  /**
   * Create the map used to keep track of the value of each children
   */
  earlyinit () {
    this.map = {}
    this.seq = 0
    this.array = this.out.read() || []
    this.int = new Pointer(this, 'array')
    this.arrayElementClass = 'array-element'
  }

  /**
   * Add a new child to the array
   * @param {Class} ChildClass Constructor for the child module
   * @param {*[]} args - List of arbitrary arguments for the constructor
   * @param {*} value - Value to give to the data in the array
   * @param {HTMLElement} element - HTML element to give to the child
   * @returns {ChildModule} - The created child
   */
  newchild (args, value, element) {
    this.seq++
    this.map[this.seq] = value
    styleElement(element, this.arrayElementClass)
    element.dataset.id = this.seq
    const child = new this.ChildClass(this, new Pointer(this.map, this.seq + ''), element, ...args)

    this.children.push(child)
    return child
  }

  /**
   * Collects all the data from the children inside the array
   */
  middleoutput () {
    this.array = []
    const children = selectElements(this.arrayElementClass, this.e)
    children.forEach(child => {
      this.array.push(this.map[child.dataset.id])
    })
  }
}

/**
 * Class for an module that represents an object,
 * with each child being a property of the object
 */
class ObjectModule extends ChildModule {
  /**
   * Creates the object in the external data if it doesn't exists
   */
  earlyinit () {
    if (!this.out.read()) this.out.assign({})
  }

  getmodules () {
    return this.iteratemodules({
      Class: 0,
      property: 1,
      args: 2
    }, o => {
      const { Class, property, args } = o
      const chOut = property
        ? new Pointer(this.out.read(), property)
        : this.out
      return new Class(this, chOut, null, ...args)
    })
  }
}

/**
 * Modules that directly communicate with an HTML element
 *
 * Currently only a semantic class
 */
class ElementModule extends ChildModule {}

/**
 * Modules that only read the external data and don't pass anything
 *
 * Currently only a semantic class
 */
class ReadonlyModule extends ChildModule {}

/**
 * Module containing a single text element
 */
class SimpleTextModule extends ElementModule {
  /**
   * @param {BaseModule} parent
   * @param {object} out
   * @param {HTMLElement} element
   * @param {string} tag - Tag for the HTML element in the module
   * @param {string} access - Name of the property the text content is stored in the element
   */
  constructor (parent, out, element, tag, access, entry, type) {
    super(parent, out, element)
    Object.assign(this, { tag, access, entry, type })
  }

  /**
   * Create text element
   */
  prebuild () { this.textInput = createElement({ parent: this.e, tag: this.tag, type: this.type }) }

  /**
   * Add pointer to the text content
   */
  postbuild () { this.int = new Pointer(this.textInput, this.entry) }

  middleoutput () { this.int = new Pointer(this.textInput, this.access) }
}

/**
 * Module containing a single HTML text input
 */
class TextInputModule extends SimpleTextModule {
  /**
   * @param {BaseModule} parent
   * @param {object} out
   * @param {HTMLElement} element
   */
  constructor (parent, out, element) { super(parent, out, element, 'input', 'value', 'value') }
}

/**
 * Module containing a single text area HTML element
 */
class TextAreaModule extends SimpleTextModule {
  /**
   *
   * @param {BaseModule} parent
   * @param {object} out
   * @param {HTMLElement} element
   */
  constructor (parent, out, element) { super(parent, out, element, 'textarea', 'value', 'innerHTML') }
}

class NumberInputModule extends SimpleTextModule {
  constructor (parent, out, element) { super(parent, out, element, 'input', 'value', 'value', 'number') }

  convertoutput (output) { return Number(output) }
}

class OptionSelectModule extends ElementModule {
  constructor (parent, out, element, options) {
    super(parent, out, element)

    Object.assign(this, { options })
  }

  prebuild () {
    this.selectElement = createElement({ parent: this.e, tag: 'select' })
    createElement({ parent: this.selectElement, tag: 'option', value: '' })
    for (const option in this.options) {
      const value = this.options[option]
      createElement({ parent: this.selectElement, tag: 'option', value, innerHTML: option })
    }
  }

  postbuild () {
    this.int = new Pointer(this.selectElement, 'value')
  }

  convertoutput (output) { return Number(output) }
}

/**
 * Get a class for an editor for a name only type
 * @param {import('../../app/database.js').TypeName} type - Name of the type of the editor
 * @returns {NameOnlyEditor} Class for the editor of the type
 */
export function getNameOnlyEditor (type) {
  /**
   * Class for an editor that contains a single module which is a text input and only updates the name property inside the data object
   */
  class NameOnlyEditor extends EditorModule {
    modules () {
      return [
        ['Name', TextInputModule, `.${type}.data.name`]
      ]
    }
  }

  return NameOnlyEditor
}

/**
 * Helper function to get the index of a child
 * inside an element (0-indexed)
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child to find index of
 * @returns {number} Index of the child
 */
function indexOfChild (parent, child) {
  return [...parent.children].indexOf(child)
}

/**
 * Class for a module that lets manage the modules of an array module through the UI
 * allowing to move them (order them), as well as possibly adding and deleting new modules
 */
class MoveableRowsModule extends ArrayModule {
  /**
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   * @param {EditorModule} ChildClass
   * @param {object} options - Options for the module
   * @param {boolean} options.useDelete - True if wants to be able to delete rows. Defaults to true
   * @param {boolean} options.useAdd - True if wants to be able to add rows. Defaults to true
   */
  constructor (parent, out, element, ChildClass, divClass, options = {
    useDelete: true,
    useAdd: true
  }) {
    super(parent, out, element, ChildClass)

    this.divClass = divClass
    this.options = options

    // CSS class for the elements
    this.delClass = 'del-button'
    this.moveClass = 'move-button'
  }

  /**
   * Build basic elements for handling the rows
   */
  prebuild () {
    this.div = createElement({ parent: this.e, className: this.divClass })
    if (this.options.useAdd) {
      this.addButton = createElement({ parent: this.div, tag: 'button', innerHTML: 'ADD' })
    }
  }

  /**
   * Renders all the rows with the user data
   */
  postbuild () { this.out.read().forEach(row => this.addRow(row)) }

  /**
   * Add control to the rows handler
   */
  presetup () {
    if (this.options.useAdd) this.setupAddButton()
    this.setupMoving()
  }

  /**
   * Adds control to the add row button
   */
  setupAddButton () {
    this.addButton.addEventListener('click', () => { this.addRow() })
  }

  /**
   * Add a new row, fresh or using predefined values
   * @param {*} value - The i/o value to bind to the children module, if any
   */
  addRow (value) {
    // create HTML elements
    const newRow = createElement({})
    const childElement = createElement({ parent: newRow })
    createElement({ parent: newRow, tag: 'button', className: this.delClass, innerHTML: 'DELETE' })
    createElement({ parent: newRow, tag: 'button', className: this.moveClass, innerHTML: 'MOVE' })

    // create module
    const childModule = this.newchild([], value, childElement)
    childModule.build()
    childModule.setup()

    // finish row setup
    if (this.addButton) this.div.insertBefore(newRow, this.addButton)
    else this.div.appendChild(newRow)
    this.setupRow(newRow)
  }

  /**
   * Add control to a moveable row
   * @param {HTMLDivElement} row - Reference to the row element
   */
  setupRow (row) {
    // to delete row
    if (this.options.useDelete) {
      selectElement(this.delClass, row).addEventListener('click', () => {
        this.div.removeChild(row)
      })
    }

    // to start dragging
    selectElement(this.moveClass, row).addEventListener('mousedown', () => {
      const index = indexOfChild(this.div, row)
      this.div.dataset.currentRow = index
      this.div.dataset.isMoving = '1'
    })

    // for the hover listener
    row.addEventListener('mouseover', () => {
      const index = indexOfChild(this.div, row)
      this.div.dataset.hoveringRow = index
    })
  }

  /**
   * Add the general control required for moving rows to work
   */
  setupMoving () {
    this.div.addEventListener('mouseup', () => {
      if (this.div.dataset.isMoving) {
        this.div.dataset.isMoving = ''
        const destination = Number(this.div.dataset.hoveringRow)
        const origin = Number(this.div.dataset.currentRow)

        // don't move if trying to move on itself
        if (destination !== origin) {
          // offset is to possibly compensate for indexes being displaced
          // post deletion
          const offset = destination > origin ? 1 : 0
          const originElement = this.div.children[origin]
          const targetElement = this.div.children[destination + offset]
          this.div.removeChild(originElement)
          this.div.insertBefore(originElement, targetElement)
        }
      }
    })
  }
}

class GridModule extends ArrayModule {
  constructor (parent, out, element, ChildClass) {
    super(parent, out, element, ChildClass)
    Object.assign(this, { ChildClass })
    this.rows = 0
    this.columns = 1
  }

  addRow (values = []) {
    this.rows++
    for (let i = 0; i < this.columns; i++) {
      const newElement = createElement({ parent: this.grid })
      const child = this.newchild([], values[i], newElement)
      child.build()
      child.setup()
    }
    this.setTemplateRows()
  }

  addColumn (values = []) {
    this.columns++
    for (let i = 0; i < this.rows; i++) {
      const newElement = createElement({})
      this.grid.insertBefore(newElement, this.grid.children[this.columns - 1 + i])
      const child = this.newchild([], values[i], newElement)
      child.build()
      child.setup()
    }
    this.setTemplateColumns()
  }

  setTemplateColumns () {
    this.grid.style.gridTemplateColumns = this.getCSS(this.columns)
  }

  setTemplateRows () {
    this.grid.style.gridTemplateRows = this.getCSS(this.rows)
  }

  getCSS (number) {
    return `repeat(${number}, 1fr)`
  }

  prebuild () {
    this.grid = createElement({ parent: this.e })
    this.grid.style.display = 'grid'
    this.rowButton = createElement({ parent: this.e, tag: 'button', innerHTML: 'Add row' })
    this.colButton = createElement({ parent: this.e, tag: 'button', innerHTML: 'Add column' })
  }

  postbuild () {
    const grid = this.out.read()
    if (grid.length) {
      const firstRow = grid[0]
      this.columns = firstRow.length
      this.setTemplateColumns()
      for (let i = 0; i < grid.length; i++) {
        this.addRow(grid[i])
      }
    } else {
      this.columns = 1
    }
  }

  presetup () {
    this.setupButtons()
  }

  setupButtons () {
    this.rowButton.addEventListener('click', () => {
      this.addRow()
    })

    this.colButton.addEventListener('click', () => {
      this.addColumn()
    })
  }

  postmidoutput () {
    const gridArray = []
    for (let i = 0; i < this.rows; i++) {
      const removed = this.array.splice(0, this.columns)
      gridArray.push(removed)
    }
    this.array = gridArray
  }
}

/**
 * Get a search query module constructor for a specific database type
 * @param {import('../../app/database.js').TypeName} type - Name of the type
 * @returns {SearchQueryModule} Module for the type
 */
function getSearchQueryModule (type) {
  /**
   * Class containing a search query element, using as the i/o data the id of the queried objects
   */
  class SearchQueryModule extends ElementModule {
    /**
     * Render input for the query
     */
    prebuild () {
      this.inputElement = createElement({ parent: this.e, tag: 'input' })
    }

    /**
     * Create pointer to query
     */
    postbuild () { this.int = new Pointer(this.inputElement.dataset, 'id') }

    convertinput (input) { return input || '' }

    /**
     * Setup search query
     */
    presetup () { createSearchQuery(this.inputElement, type) }

    /**
     * Convert the data before outputting it
     */
    async postoutput () {
      const id = this.int.read()
      this.out.assign(id ? Number(id) : null)
    }
  }

  return SearchQueryModule
}

/**
 * Get a search query module for the wiki references
 * @returns {ElementModule} Module for the reference search query
 */
function getReferenceSearchModule () {
  return getSearchQueryModule('wiki_reference')
}

/**
 * Module for editting the data for a localization name
 */
class LocalizationNameModule extends ObjectModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.e = createElement({ parent: this.e, classes: ['hidden', 'localization-name'] })
  }

  modules () {
    return [
      [TextInputModule, 'name'],
      [getReferenceSearchModule(), 'reference'],
      [TextAreaModule, 'translationNotes']
    ]
  }
}

/**
 * Module for grouping the different localization names
 */
class LocalizationNamesModule extends ObjectModule {
  /**
   * Create element to hold the localization names
   */
  initialize () {
    this.e = createElement({})
  }

  /**
   * Add language select and element
   */
  prebuild () {
    const html = `
      <option selected> [PICK LOCALIZATION] </option>
      <option value="0"> Portuguese </option>
      <option value="1"> French </option>
      <option value="2"> Spanish </option>
      <option value="3"> German </option>
      <option value="4"> Russian </option>
    `
    this.langSelect = createElement({ parent: this.parent.e, tag: 'select', innerHTML: html })
    this.parent.e.appendChild(this.e)
  }

  /**
   * Add control to the language select
   */
  presetup () {
    this.langSelect.addEventListener('change', () => {
      const langNamesDiv = this.parent.e.children[3]
      const targetElement = langNamesDiv.children[Number(this.langSelect.value)]
      const previousElement = langNamesDiv.querySelector(':scope > div:not(.hidden)')

      if (previousElement) previousElement.classList.add('hidden')
      if (targetElement) targetElement.classList.remove('hidden')
    })
  }

  modules () {
    return [
      [LocalizationNameModule, 'pt'],
      [LocalizationNameModule, 'fr'],
      [LocalizationNameModule, 'es'],
      [LocalizationNameModule, 'de'],
      [LocalizationNameModule, 'ru']
    ]
  }
}

/**
 * Module for editting a song name (official)
 */
class SongNameModule extends ObjectModule {
  /**
   * Style row
   */
  initialize () { styleElement(this.e, 'name-row') }

  modules () {
    return [
      [TextInputModule, 'name'],
      [getReferenceSearchModule(), 'reference'],
      [LocalizationNamesModule, '']
    ]
  }
}

/**
 * Module for editting a song author
 */
class SongAuthorModule extends ObjectModule {
  modules () {
    return [
      [getSearchQueryModule('author'), 'author'],
      [getReferenceSearchModule(), 'reference']
    ]
  }
}

/**
 * Module for displaying a song's audio file
 */
class AudioFileModule extends ReadonlyModule {
  /**
   * Render the audio player
   */
  prebuild () {
    this.audioParent = createElement({ parent: this.e, innerHTML: generateAudio(this.out.read()) })
  }
}

/**
 * Module for an unofficial name
 */
class UnofficialNameModule extends ObjectModule {
  modules () {
    return [
      [TextInputModule, 'name'],
      [TextAreaModule, 'description']
    ]
  }
}

/**
 * Module for a song version object
 */
class SongVersionModule extends ObjectModule {
  modules () {
    return [
      [TextInputModule, 'name'],
      [TextAreaModule, 'description']
    ]
  }
}

/**
 * Module for a date input element
 */
class DateInputModule extends ElementModule {
  /**
   * Build date input and pointer
   */
  prebuild () {
    this.dateInput = createElement({ parent: this.e, tag: 'input', type: 'date' })
    this.int = new Pointer(this.dateInput, 'value')
  }
}

class DateEstimateModule extends ObjectModule {
  modules () {
    return [
      [DateInputModule, 'date'],
      [CheckboxModule, 'isEstimate']
    ]
  }
}

class TimeRangeModule extends ObjectModule {
  modules () {
    return [
      [DateEstimateModule, 'start'],
      [DateEstimateModule, 'end']
    ]
  }
}

/**
 * Base class for the top module of an editor
 */
class EditorModule extends ReceptorModule {
  getmodules () {
    return this.iteratemodules({
      header: 0,
      Class: 1,
      path: 2,
      args: 3
    }, o => {
      const { header, Class, path, args } = o
      const RowModule = getEditorRowModule(header, Class, true, args)
      return new RowModule(this, path)
    })
  }
}

/**
 * Module for the song editor
 */
export class SongEditor extends EditorModule {
  modules () {
    const song = prop => `.song.data.${prop}`
    return [
      ['Names', MoveableRowsModule, song('names'), [SongNameModule, 'name-div']],
      ['Authors', MoveableRowsModule, song('authors'), [SongAuthorModule, 'authors-div']],
      ['Youtube Link', TextInputModule, song('link')],
      ['Song Files', MoveableRowsModule, song('files'), [AudioFileModule, 'audios-div', { useAdd: false, useDelete: false }]],
      ['Unofficial Names', MoveableRowsModule, song('unofficialNames'), [UnofficialNameModule]],
      ['SWF Music IDs', MoveableRowsModule, song('swfMusicNumbers'), [TextInputModule]],
      ['First Paragraph', TextAreaModule, song('firstParagraph')],
      ['Page Source Code', TextAreaModule, song('page')],
      ['Key Signatures', MoveableRowsModule, song('keySignatures'), [getSearchQueryModule('key_signature')]],
      ['Musical Genres', MoveableRowsModule, song('genres'), [getSearchQueryModule('genre')]],
      ['Page Categories', MoveableRowsModule, song('categories'), [getSearchQueryModule('category')]],
      ['Song Versions', MoveableRowsModule, song('versions'), [SongVersionModule]],
      ['Date Composed', DateEstimateModule, song('composedDate')],
      ['External Release Date', DateInputModule, song('externalReleaseDate')]
    ]
  }
}

/**
 * Module for the reference editor
 */
export class ReferenceEditor extends EditorModule {
  modules () {
    const file = prop => `.wiki_reference.data.${prop}`
    return [
      ['Reference Name', TextInputModule, file('name')],
      ['Link to Reference (if needed)', TextInputModule, file('link')],
      ['Reference Description', TextAreaModule, file('description')]
    ]
  }
}

/**
 * Module containing only a checkbox and having its checked property as the i/o data
 */
class CheckboxModule extends ElementModule {
  /**
   * Render the checkbox
   */
  prebuild () {
    this.checkbox = createElement({ parent: this.e, tag: 'input', type: 'checkbox' })
  }

  /**
   * Create the internal pointer
   */
  postbuild () { this.int = new Pointer(this.checkbox, 'checked') }
}

/**
 * Module for a file upload element
 */
class FileUploadModule extends ElementModule {
  /**
   * Render the HTML element
   */
  prebuild () {
    this.fileUpload = createElement({ parent: this.e, tag: 'input', type: 'file' })
  }

  /**
   * Send the file to the backend to get its data and then output it
   */
  async middleoutput () {
    const file = this.fileUpload.files[0]
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('api/submit-file', {
      method: 'POST',
      body: formData
    })
    const fileData = await response.json()
    Object.assign(this.out.read(), fileData)
  }
}

/**
 * Module for the file editor
 */
export class FileEditor extends EditorModule {
  modules () {
    const id = this.r.file.id
    let FileClass
    let fileHeader
    if (id) {
      FileClass = AudioFileModule
      fileHeader = 'Audio Preview'
    } else {
      FileClass = FileUploadModule
      fileHeader = 'Upload the audio file'
    }
    return [
      ['File Source', getSearchQueryModule('source'), '.file.data.source'],
      ['Link to Source (if needed)', TextInputModule, '.file.data.sourceLink'],
      ['Is it HQ?', CheckboxModule, '.file.data.isHQ'],
      [fileHeader, FileClass, '.file.data']
    ]
  }
}

/**
 * Get a class for an editor's row
 * @param {string} header - Header of the row
 * @param {Class} ChildClass - Constructor for the class to be included
 * @param {boolean} useExpand - True if wants to use and expand button for the row
 * @param {*[]} args - Arbitrary arguments for the constructor
 * @returns {EditorModule} - Constructor for the editor's row
 */
function getEditorRowModule (header, ChildClass, useExpand, args = []) {
  class EditorRowModule extends ConnectionModule {
    /**
     * Render the HTML elements
     */
    prebuild () {
      createElement({ parent: this.parent.e, innerHTML: header })
      const row = createElement({ parent: this.parent.e })
      if (useExpand) {
        this.expandButton = createElement({ parent: row, tag: 'button', innerHTML: 'expand' })
      }
      const childElement = createElement({ parent: row })
      this.childModule = new ChildClass(this, this.out, childElement, ...args)
    }

    /**
     * Render child module
     */
    postbuild () {
      this.childModule.build()
      this.childModule.input()
    }

    /**
     * Give control and add the child to children
     */
    presetup () {
      this.children.push(this.childModule)
      if (useExpand) this.setupExpand()
    }

    /**
     * Add control to the expand button
     */
    setupExpand () {
      const targetElement = this.expandButton.parentElement.children[1]
      const hide = () => {
        targetElement.classList.add('hidden')
      }
      hide()
      this.expandButton.addEventListener('click', () => {
        if (targetElement.classList.contains('hidden')) {
          targetElement.classList.remove('hidden')
          this.expandButton.classList.add('hidden')
        } else {
          hide()
        }
      })
    }
  }

  return EditorRowModule
}

export class GenreEditor extends EditorModule {
  modules () {
    return [
      ['Genre Name', TextInputModule, '.genre.data.name'],
      ['External Link', TextInputModule, '.genre.data.link']
    ]
  }
}

export class InstrumentEditor extends EditorModule {
  modules () {
    return [
      ['Instrument Name', TextInputModule, '.instrument.data.name'],
      ['External Link', TextInputModule, '.instrument.data.link']
    ]
  }
}

export class KeysigEditor extends EditorModule {
  modules () {
    return [
      ['Key Signature Name', TextInputModule, '.key_signature.data.name'],
      ['External Link', TextInputModule, '.key_signature.data.link']
    ]
  }
}

export class PageEditor extends EditorModule {
  modules () {
    return [
      ['Page Title', TextInputModule, '.page.data.name'],
      ['Content', TextAreaModule, '.page.data.content'],
      ['Categories', MoveableRowsModule, '.page.data.categories', [getSearchQueryModule('category')]]
    ]
  }
}

class SongAppearanceModule extends ObjectModule {
  modules () {
    return [
      [CheckboxModule, 'isUnused'],
      [TimeRangeModule, 'available'],
      [getSearchQueryModule('song'), 'song'],
      [getReferenceSearchModule(), 'reference']
    ]
  }
}

export class FlashroomEditor extends EditorModule {
  modules () {
    return [
      ['Room Name', TextInputModule, '.flash_room.data.name'],
      ['Time period the room was open', TimeRangeModule, '.flash_room.data.open'],
      ['Songs uses in the room', MoveableRowsModule, '.flash_room.data.songUses', [SongAppearanceModule]]
    ]
  }
}

class PartySongModule extends ObjectModule {
  modules () {
    return [
      [CheckboxModule, 'isUnused'],
      [OptionSelectModule, 'type', [{
        Room: 1,
        Minigame: 2
      }]],
      [CheckboxModule, 'usePartyDate'],
      [TimeRangeModule, 'available'],
      [getSearchQueryModule('song'), 'song']
    ]
  }
}

export class FlashpartyEditor extends EditorModule {
  modules () {
    return [
      ['Party Name', TextInputModule, '.flash_party.data.name'],
      ['Period the party was actiuve', TimeRangeModule, '.flash_party.data.active'],
      ['Songs used in the party', MoveableRowsModule, '.flash_party.data.partySongs', [PartySongModule]]
    ]
  }
}

class CatalogueItemModule extends ObjectModule {
  modules () {
    return [
      [TextInputModule, 'displayName'],
      [getSearchQueryModule('song'), 'song']
    ]
  }
}

export class MuscatalogEditor extends EditorModule {
  modules () {
    return [
      ['Catalogue Title', TextInputModule, '.music_catalogue.data.name'],
      ['Catalogue Notes', TextAreaModule, '.music_catalogue.data.description'],
      ['Catalogue Date', DateEstimateModule, '.music_catalogue.data.date'],
      ['Song List', GridModule, '.music_catalogue.data.songs', [CatalogueItemModule]],
      ['Catalogue Reference', getReferenceSearchModule(), '.music_catalogue.data.reference']
    ]
  }
}

class StageAppearanceModule extends ObjectModule {
  modules () {
    return [
      [CheckboxModule, 'isUnused'],
      [TimeRangeModule, 'appearance'],
      [getReferenceSearchModule(), 'reference']
    ]
  }
}

export class StageEditor extends EditorModule {
  modules () {
    return [
      ['Stage Play Name', TextInputModule, '.stage_play.data.name'],
      ['Play Theme Song', getSearchQueryModule('song'), '.stage_play.data.song'],
      ['Play Debuts', MoveableRowsModule, '.stage_play.data.appearances', [StageAppearanceModule]]
    ]
  }
}

class MinigameSongModule extends ObjectModule {
  modules () {
    return [
      [CheckboxModule, 'isUnused'],
      [getSearchQueryModule('song'), 'song'],
      [CheckboxModule, 'useMinigameDates'],
      [TimeRangeModule, 'available']
    ]
  }
}

export class FlashgameEditor extends EditorModule {
  modules () {
    return [
      ['Minigame Name', TextInputModule, '.flash_minigame.data.name'],
      ['Time period game is playable', TimeRangeModule, '.flash_minigame.data.available'],
      ['Minigame songs', MoveableRowsModule, '.flash_minigame.data.songs', [MinigameSongModule]]
    ]
  }
}

/**
 * Generates HTML for an audio element based on a file
 * @param {import('../../app/database.js').TypeData} file - Data for the file
 * @returns {string} Generated HTML for the audio element
 */
function generateAudio (file) {
  const name = file.originalname || ''
  const filePath = file.filename || ''
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
    return `<audio src="../music/${filePath}" controls data-name="${name}"></audio>`
  }
  return '<div>Could not load</div>'
}
