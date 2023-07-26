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
 * It also can store children modules. To define the modules, you must overwrite the function `basemodules`, docs on how to do it are on the function docs
 *
 * The entry points for the class are the methods:
 * * `initialize` To run code in the construction, specifically before creating modules (last constructor step)
 * * `prebuild` To render HTML elements specific to this class
 * * `postbuild` To run code after rerendering the HTML elements
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
    this.addcss()
    this.out = new Pointer(reference, property)
    if (this.initialize) this.initialize()
    this.modules = this.createModules()
  }

  parentcss () {}

  addcss () {
    const classes = this.parentcss()
    if (typeof classes === 'string') {
      this.parent.classList.add(classes)
    } else if (Array.isArray(classes)) {
      classes.forEach(className => {
        this.parent.classList.add(className)
      })
    }
  }

  /**
   * Build all HTML elements for the module
   */
  build () {
    if (this.prebuild) this.prebuild()
    this.iterateModules('build')
    if (this.postbuild) this.postbuild()
  }

  /**
   * Update all HTML elements with the database data
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
   * Method that should return the children modules
   *
   * The base modules list should be an array of arrays, each array representing a different modules,
   * and it can have up to 5 elements:
   * * Index 0 - Name of the property for the external pointer
   * * Index 1 - Constructor of the module class
   * * Index 2 - Reference to the object for the external pointer
   * * Index 3 - Parent HTML element
   * * Index 4 - An array of extra arguments to feed to the class constructor
   *
   * If elements are repeated, they can be left empty/undefined (see examples)
   * @returns {*[][]}
   */
  basemodules () { return [] }

  /**
   * Method that converts the output of the `basemodules` method and converts it into the children modules list
   * @returns {EditorModule[]} Empty list
   */
  createModules () {
    const modules = []
    const memory = {}
    this.basemodules().forEach(module => {
      for (let i = 0; i < 4; i++) {
        const element = module[i]

        if (!element) {
          module[i] = memory[i]
        } else if (element) {
          memory[i] = element
        }
      }
      const args = module[4] || []
      const Class = module[1]
      modules.push(new Class(module[3], module[2], module[0], ...args))
    })
    return modules
  }

  /**
   * Helper method to iterate through all the children modules and call a function from the modules
   * @param {string} fn - Name of the function to call
   */
  iterateModules (fn) {
    this.modules.forEach(module => module[fn]())
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
  postbuild () { this.int = new Pointer(this.textInput, this.access) }
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
    basemodules () {
      return [
        ['name', TextInputModule, this.out.r[type].data, this.parent]
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
  constructor (parent, reference, property, childClass, divClass, options = {
    useDelete: true,
    useAdd: true
  }) {
    super(parent, reference, property)

    this.divClass = divClass
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
    this.div = createElement({ parent: this.parent, className: this.divClass })
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
    // childModule.input()
    childModule.setup()
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
function getSearchQueryModule (type) {
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
    postbuild () { this.int = new Pointer(this.inputElement.dataset, 'id') }

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

  return SearchQueryModule
}

/**
 * Get a search query module for the wiki references
 * @param {HTMLElement} parent - HTML element to render the module in
 * @param {object} reference - Object reference to external pointer
 * @param {string} property - Name of the property in external pointer
 * @returns {EditorModule} Module with the search query for the wiki references
 */
function getReferenceSearchModule () {
  return getSearchQueryModule('wiki_reference')
}

/**
 * Module for editting the data for a localization name
 */
class LocalizationNameModule extends EditorModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.data = this.out.read() || {}
    this.int = new Pointer(this, 'data')
    this.div = createElement({ classes: ['hidden', 'localization-name'] })
  }

  prebuild () {
    this.parent.appendChild(this.div)
  }

  basemodules () {
    return [
      ['name', TextInputModule, this.data, this.div],
      ['reference', getReferenceSearchModule()],
      ['translationNotes', TextAreaModule]
    ]
  }
}

class LocalizationNamesModule extends EditorModule {
  initialize () {
    this.name = this.out.read() || {}
    this.int = new Pointer(this, 'name')
    this.div = createElement({ })
  }

  prebuild () {
    const html = `
      <option selected> [PICK LOCALIZATION] </option>
      <option value="0"> Portuguese </option>
      <option value="1"> French </option>
      <option value="2"> Spanish </option>
      <option value="3"> German </option>
      <option value="4"> Russian </option>
    `
    this.langSelect = createElement({ parent: this.parent, tag: 'select', innerHTML: html })
    this.parent.appendChild(this.div)
  }

  presetup () {
    this.langSelect.addEventListener('change', () => {
      const langNamesDiv = this.parent.children[3]
      const targetElement = langNamesDiv.children[Number(this.langSelect.value)]
      const previousElement = langNamesDiv.querySelector(':scope > div:not(.hidden)')

      if (previousElement) previousElement.classList.add('hidden')
      if (targetElement) targetElement.classList.remove('hidden')
    })
  }

  basemodules () {
    return [
      ['pt', LocalizationNameModule, this.name, this.div],
      ['fr'],
      ['es'],
      ['de'],
      ['ru']
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

  parentcss () { return 'name-row' }

  basemodules () {
    return [
      ['name', TextInputModule, this.name, this.parent],
      ['reference', getReferenceSearchModule()],
      [this.out.p, LocalizationNamesModule, this.out.r]
    ]
  }

  postoutput () {
    console.log(this.out.r)
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

  basemodules () {
    return [
      ['author', getSearchQueryModule('author'), this.author, this.parent],
      ['reference', getReferenceSearchModule()]
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
  postbuild () {
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
  parentcss () { return 'song-editor' }

  basemodules () {
    return [
      ['names', getEditorRowModule('Names', MoveableRowsModule, true, [SongNameModule, 'name-div']), this.out.r.song.data, this.parent],
      ['authors', getEditorRowModule('Authors', MoveableRowsModule, true, [SongAuthorModule, 'authors-div']), ...Array(2)],
      ['link', getEditorRowModule('YouTube Link', TextInputModule, true)],
      ['files', getEditorRowModule('Song Files', MoveableRowsModule, true, [AudioFileModule, 'audios-div'])]
    ]
  }

  postoutput () {
  }

  // modules () {
  //   return
  // }
}

/**
 * Module for the reference editor
 */
export class ReferenceEditor extends EditorModule {
  basemodules () {
    return [
      ['name', TextInputModule, this.out.r.wiki_reference, this.parent],
      ['link'],
      ['description', TextAreaModule]
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
  postbuild () { this.int = new Pointer(this.checkbox, 'checked') }
}

/**
 * Module for the file editor
 */
export class FileEditor extends EditorModule {
  basemodules () {
    return [
      ['source', getSearchQueryModule('source'), this.out.r.file, this.parent],
      ['sourceLink', TextAreaModule],
      ['isHQ', CheckboxModule]
    ]
  }
}

function getEditorRowModule (header, ChildClass, useExpand, args = []) {
  class EditorRowModule extends EditorModule {
    prebuild () {
      createElement({ parent: this.parent, innerHTML: header })
      const row = createElement({ parent: this.parent })
      if (useExpand) {
        this.expandButton = createElement({ parent: row, tag: 'button', innerHTML: 'expand' })
      }
      const childElement = createElement({ parent: row })
      this.childModule = new ChildClass(childElement, this.out.r, this.out.p, ...args)
    }

    postbuild () {
      this.childModule.build()
      this.childModule.input()
      this.childModule.setup()
    }

    presetup () {
      this.modules.push(this.childModule)

      if (useExpand) this.setupExpand()
    }

    setupExpand () {
    // const currentStyle = this.view.editor.style.gridTemplateRows
    // const rowStyles = currentStyle.split(' ')

      // expandButtons.forEach((button, i) => {
      const targetElement = this.expandButton.parentElement.children[1]
      const hide = () => {
      // this.swapTemplateRow(i + 1, '50px')
        targetElement.classList.add('hidden')
      }
      hide()
      this.expandButton.addEventListener('click', () => {
        if (targetElement.classList.contains('hidden')) {
          targetElement.classList.remove('hidden')
          // this.swapTemplateRow(i + 1, rowStyles[i])
          this.expandButton.classList.add('hidden')
        } else {
          hide()
        }
      })
    // })
    }
  }

  return EditorRowModule
}
