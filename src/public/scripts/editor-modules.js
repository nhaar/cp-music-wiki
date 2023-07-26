import { generateAudio } from './file.js'
import { createSearchQuery } from './query-options.js'
import { createElement, selectElement } from './utils.js'

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
}

/**
 * Class for a module in the editor
 *
 * The editor is a module itself, and it is composed of module, so a module consists
 * of the fundamental piece for the editor
 *
 * It represents a way to connect the backend with the user
 *
 * The module consists of a pointer that brings data from outside, and a pointer that points to the user data,
 * which is stored in the page
 *
 * It also can store children modules. To give children modules, you need to overwrite the `createModules` method returning the list of the children modules
 *
 * The entry points for the class are the methods:
 * * `initialize` To run code in the construction, specifically before creating modules (last constructor step)
 * * `prebuild` To render HTML elements specific to this class
 * * `preinput` Code to run before updating the HTML elements with the database data
 * * `convertinput` Code to convert the input when exchanging from internal to external, if needed
 * * `presetup` To add controls specific to the HTML elements for this class
 * * `middleoutput` Run code after all children modules `output`s were called but before passing data from this module to outside
 * * `postoutput` Run code after passing data to outside this module
 */
class EditorModule {
  /**
   * Link external pointer and HTML element
   * @param {HTMLElement} parent - Reference to the HTML element the module will be rendered on
   * @param {object} reference - Reference to the object for external pointer
   * @param {string} property - Name of the property for the external pointer
   */
  constructor (parent, reference, property) {
    this.parent = parent
    this.out = new Pointer(reference, property)
    if (this.initialize) this.initialize()
    this.modules = this.createModules()
  }

  /**
   * Build all HTML elements for the module
   */
  build () {
    if (this.prebuild) this.prebuild()
    this.iterateModules('build')
  }

  /**
   * Update all HTML elements with the database data
   */
  input () {
    if (this.preinput) this.preinput()
    if (this.int) {
      if (this.convertinput) {
        this.out.assign(this.convertinput(this.int.read()))
      } else {
        this.out.exchange(this.int)
      }
    }
    this.iterateModules('input')
  }

  /**
   * Add control to all the HTML elements in the module
   */
  setup () {
    if (this.presetup) this.presetup()
    this.iterateModules('setup')
  }

  /**
   * Passes data stored in the module to outside (either parent module or to the backend)
   */
  output () {
    this.iterateModules('output')
    if (this.middleoutput) this.middleoutput()
    if (this.int) this.int.exchange(this.out)
    if (this.postoutput) this.postoutput()
  }

  /**
   * Default method returning an empty list
   * @returns {EditorModule[]} Empty list
   */
  createModules () { return [] }

  /**
   * Helper method to iterate through all the children modules and call a function from the modules
   * @param {string} fn - Name of the function to call
   */
  iterateModules (fn) {
    this.modules.forEach(module => { module[fn]() })
  }
}

/**
 * Module containing a single text element
 */
class SimpleTextModule extends EditorModule {
  /**
   * Create module linked to pointer and element
   * @param {HTMLElement} parent - HTML element to render the text element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   * @param {string} tag - Tag for the text element in the module
   * @param {string} access - Name of the property the text content is stored in the element
   */
  constructor (parent, reference, property, tag, access) {
    super(parent, reference, property)
    Object.assign(this, { tag, access })
  }

  /**
   * Create text element
   */
  prebuild () { this.textInput = createElement({ parent: this.parent, tag: this.tag }) }

  /**
   * Create internal pointer
   */
  preinput () { this.int = new Pointer(this.textInput, this.access) }
}

/**
 * Module containing a single text input
 */
class TextInputModule extends SimpleTextModule {
  /**
   * Create module linked to pointer and element
   * @param {HTMLElement} parent - HTML element to render the text element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   */
  constructor (parent, reference, property) { super(parent, reference, property, 'input', 'value') }
}

/**
 * Module containing a single text area element
 */
class TextAreaModule extends SimpleTextModule {
  /**
   * Create module linked to pointer and element
   * @param {HTMLElement} parent - HTML element to render the text element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   */
  constructor (parent, reference, property) { super(parent, reference, property, 'textarea', 'innerHTML') }
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
    createModules () {
      return [
        new TextInputModule(this.parent, this.out.r[type].data, 'name')
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
 * Class for a module that groups a number of children modules of the same type inside,
 * allowing to move them (order them), as well as possibly adding and deleting new modules
 *
 * The i/o data is grouped inside an array where each element is the i/o data of the children modules,
 * ordered in the order they show up in the page
 */
class MoveableRowsModule extends EditorModule {
  /**
   * Create rows module linked to pointer, element and children module
   * @param {HTMLElement} parent - HTML element to render the element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   * @param {EditorModule} childClass - Class for the children module
   * @param {object} options - Options for the module
   * @param {boolean} options.useDelete - True if wants to be able to delete rows. Defaults to true
   * @param {boolean} options.useAdd - True if wants to be able to add rows. Defaults to true
   */
  constructor (parent, reference, property, childClass, options = {
    useDelete: true,
    useAdd: true
  }) {
    super(parent, reference, property)

    this.ChildClass = childClass
    this.options = options

    // CSS class for the elements
    this.delClass = 'del-button'
    this.moveClass = 'move-button'

    /** Keep track of the highest row id @type {number} */
    this.seq = 0

    /** Keeps track of the value of each id @type {object} */
    this.indexValue = {}
  }

  /**
   * Build basic elements for handling the rows
   */
  prebuild () {
    this.div = createElement({ parent: this.parent })
    if (this.options.useAdd) {
      this.addButton = createElement({ parent: this.div, tag: 'button', innerHTML: 'ADD' })
    }
  }

  /**
   * Renders all the rows with the user data
   */
  preinput () { this.out.read().forEach(row => this.addRow(row)) }

  /**
   * Add control to the rows handler
   */
  presetup () {
    if (this.options.useAdd) this.setupAddButton()
    this.setupMoving()
  }

  /**
   * Add the i/o data from the children to the i/o array
   */
  middleoutput () {
    // array that will be used to store the i/o data of children modules
    this.data = []
    this.int = new Pointer(this, 'data')

    const rows = Array.from(this.div.children).filter(child => child.tagName === 'DIV')
    console.log(rows)
    rows.forEach(row => {
      this.data.push(this.indexValue[row.dataset.id])
    })
  }

  /**
   * Adds control to the add row button
   */
  setupAddButton () {
    this.addButton.addEventListener('click', () => this.addRow())
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

    // update id and save values
    this.seq++
    newRow.dataset.id = this.seq
    this.indexValue[this.seq] = value

    // create module
    const childModule = new this.ChildClass(childElement, this.indexValue, this.seq + '')
    childModule.build()
    this.modules.push(childModule)

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

/**
 * Get a search query module for a specific database type
 * @param {HTMLElement} parent - HTML element to render the module in
 * @param {object} reference - Object reference to external pointer
 * @param {string} property - Name of the property in external pointer
 * @param {import('../../app/database.js').TypeName} type - Name of the type to search query
 * @returns {SearchQueryModule} Module with the search query for the type
 */
function newSearchQueryModule (parent, reference, property, type) {
  /**
   * Class containing a search query element, using as the i/o data the id of the queried objects
   */
  class SearchQueryModule extends EditorModule {
    /**
     * Render input for the query
     */
    prebuild () {
      this.inputElement = createElement({ parent: this.parent, tag: 'input' })
    }

    /**
     * Create pointer to query
     */
    preinput () { this.int = new Pointer(this.inputElement.dataset, 'id') }

    convertinput (input) { return input || '' }

    /**
     * Setup search query
     */
    presetup () { createSearchQuery(this.inputElement, type) }

    /**
     * Convert the data before outputting it
     */
    postoutput () {
      const id = this.int.read()
      this.out.assign(id ? Number(id) : null)
    }
  }

  return new SearchQueryModule(parent, reference, property)
}

/**
 * Get a search query module for the wiki references
 * @param {HTMLElement} parent - HTML element to render the module in
 * @param {object} reference - Object reference to external pointer
 * @param {string} property - Name of the property in external pointer
 * @returns {EditorModule} Module with the search query for the wiki references
 */
function newReferenceSearchModule (parent, reference, property) {
  return newSearchQueryModule(parent, reference, property, 'wiki_reference')
}

/**
 * Module for editting the data for a localization name
 */
class LocalizationNameModule extends EditorModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.data = this.out.read()
    this.int = new Pointer(this, 'data')
  }

  /**
   * Create children modules
   * @returns {EditorModule[]}
   */
  createModules () {
    return [
      new TextInputModule(this.parent, this.data, 'name'),
      newReferenceSearchModule(this.parent, this.data, 'reference'),
      new TextAreaModule(this.parent, this.data, 'translationNotes')
    ]
  }
}

/**
 * Module for editting a song name (official)
 */
class SongNameModule extends EditorModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.name = this.out.read() || {}
    this.int = new Pointer(this, 'name')
  }

  /**
   * Create children modules
   * @returns
   */
  createModules () {
    return [
      new TextInputModule(this.parent, this.name, 'name'),
      newReferenceSearchModule(this.parent, this.name, 'reference'),
      new LocalizationNameModule(this.parent, this.name, 'pt'),
      new LocalizationNameModule(this.parent, this.name, 'fr'),
      new LocalizationNameModule(this.parent, this.name, 'es'),
      new LocalizationNameModule(this.parent, this.name, 'de'),
      new LocalizationNameModule(this.parent, this.name, 'ru')
    ]
  }
}

/**
 * Module for editting a song author
 */
class SongAuthorModule extends EditorModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.author = this.out.read() || {}
    this.int = new Pointer(this, 'author')
  }

  /**
   * Create children modules
   * @returns {EditorModule} List of children modules
   */
  createModules () {
    return [
      newSearchQueryModule(this.parent, this.author, 'author', 'author'),
      newReferenceSearchModule(this.parent, this.author, 'reference')
    ]
  }
}

/**
 * Module for displaying a song's audio file
 */
class AudioFileModule extends EditorModule {
  /**
   * Render the element
   */
  prebuild () {
    this.audioParent = createElement({ parent: this.parent, innerHTML: generateAudio(this.out.read()) })
  }

  /**
   * Create the internal pointer
   */
  preinput () {
    this.data = this.modules.read() || {}
    this.int = new Pointer(this, 'data')
  }
}

/**
 * Module for the song editor
 */
export class SongEditor extends EditorModule {
  /**
   * Create children modules
   * @returns {EditorModule} List of children modules
   */
  createModules () {
    return [
      new MoveableRowsModule(this.parent, this.out.r.song.data, 'names', SongNameModule),
      new MoveableRowsModule(this.parent, this.out.r.song.data, 'authors', SongAuthorModule),
      new TextInputModule(this.parent, this.out.r.song.data, 'link'),
      new MoveableRowsModule(this.parent, this.out.r.song.data, 'files', AudioFileModule)
    ]
  }

  postoutput () {
    console.log(this.out.r)
  }

  initialize() { console.log(this.out.r) }
}

/**
 * Module for the reference editor
 */
export class ReferenceEditor extends EditorModule {
  /**
   * Create children modules
   * @returns {EditorModule} List of children modules
   */
  createModules () {
    const { data } = this.out.r.wiki_reference
    return [
      new TextInputModule(this.parent, data, 'name'),
      new TextInputModule(this.parent, data, 'link'),
      new TextAreaModule(this.parent, data, 'description')
    ]
  }
}

/**
 * Module containing only a checkbox and having its checked property as the i/o data
 */
class CheckboxModule extends EditorModule {
  /**
   * Render the checkbox
   */
  prebuild () {
    this.checkbox = createElement({ parent: this.parent, tag: 'input', type: 'checkbox' })
  }

  /**
   * Create the internal pointer
   */
  preinput () { this.int = new Pointer(this.checkbox, 'checked') }
}

/**
 * Module for the file editor
 */
export class FileEditor extends EditorModule {
  /**
   * Create children modules
   * @returns {EditorModule} List of children modules
   */
  createModules () {
    return [
      newSearchQueryModule(this.parent, this.out.r.file, 'source', 'source'),
      new TextAreaModule(this.parent, this.out.r.file, 'sourceLink'),
      new CheckboxModule(this.parent, this.out.r.file, 'isHQ')
    ]
  }
}
