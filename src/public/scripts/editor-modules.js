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

  /**
   * Create a pointer using an object reference and the path to an element inside the object
   * @param {object} reference - Object reference to save
   * @param {string} path - A string representation of the path, for example, '.property[0][1].property'
   * @returns {Pointer} Result pointer
   */
  static fromPath (reference, path) {
    const steps = path.match(/\.\w+|\[.\]/g)
    let pointer
    const iterator = (obj, current, steps) => {
      const step = steps[current]
      if (step.includes('.')) {
        const prop = step.match(/[^.]+/)[0]
        if (current === steps.length - 1) pointer = new Pointer(obj, prop)
        else iterator(obj[prop], current + 1, steps)
      } else if (step.includes('[')) {
        const i = Number(step.match(/\[(.*?)\]/)[1])
        iterator(obj[i], current + 1, steps)
      }
    }

    iterator(reference, 0, steps)
    return pointer
  }
}

class BaseModule {
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

  getmodules () { return [] }

  modules () { return [] }

  build () {
    if (this.prebuild) this.prebuild()
    this.iterateChildren('build')
    if (this.postbuild) this.postbuild()
  }

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

  setup () {
    if (this.presetup) this.presetup()
    this.iterateChildren('setup')
  }

  async output () {
    for (let i = 0; i < this.children.length; i++) {
      await this.children[i].output()
    }
    if (this.middleoutput) await this.middleoutput()
    console.log(this)
    if (this.int) this.int.exchange(this.out)
    if (this.postoutput) await this.postoutput()
  }

  /**
   * Helper method to iterate through all the children modules and call a function from the modules
   * @param {string} fn - Name of the function to call
   */
  iterateChildren (fn) {
    this.children.forEach(child => child[fn]())
  }
}

class ChildModule extends BaseModule {
  constructor (parent, out, element) {
    super()
    Object.assign(this, { parent, out })
    this.e = element || parent.e
    if (this.earlyinit) this.earlyinit()
    if (this.initialize) this.initialize()
    this.children = this.getmodules()
  }
}

class ReceptorModule extends BaseModule {
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

class ConnectionModule extends ChildModule {
  getmodules () {
    return this.iteratemodules({
      Class: 0,
      args: 1
    }, o => new o.Class(this.parent, this.out, null, ...o.args))
  }
}

class ArrayModule extends ChildModule {
  initialize () {
    this.map = {}
    this.seq = 0
    this.array = this.out.read() || []
    this.int = new Pointer(this, 'array')
  }

  newchild (ChildClass, args, value, element) {
    this.seq++
    this.map[this.seq] = value
    console.log(this.map)
    const child = new ChildClass(this, new Pointer(this.map, this.seq + ''), element, ...args)

    this.children.push(child)
    return child
  }

  middleoutput () {
    this.array = []
    this.children.forEach(child => {
      this.array.push(child.out.read())
    })
  }
}

class ObjectModule extends ChildModule {
  earlyinit () {
    console.log(this)
    if (!this.out.read()) this.out.assign({})
  }

  getmodules () {
    return this.iteratemodules({
      Class: 0,
      property: 1,
      args: 2
    }, o => {
      const { Class, property, args } = o
      console.log(property, this)
      const chOut = property
        ? new Pointer(this.out.read(), property)
        : this.out
      console.log(chOut)
      return new Class(this.parent, chOut, null, ...args)
    })
  }
}

class ElementModule extends ChildModule {}

class ReadonlyModule extends ChildModule {}

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
 * It also can store children modules. To define the modules, you must overwrite the function `modules`, docs on how to do it are on the function docs
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
  async output () {
    for (let i = 0; i < this.modules.length; i++) {
      await this.modules[i].output()
    }
    if (this.middleoutput) await this.middleoutput()
    if (this.int) this.int.exchange(this.out)
    if (this.postoutput) await this.postoutput()
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
  modules () { return [] }

  processedmodules () { return this.modules() }

  /**
   * Method that converts the output of the `modules` method and converts it into the children modules list
   * @returns {EditorModule[]} Empty list
   */
  createModules () {
    const modules = []
    const memory = {}

    this.processedmodules().forEach(module => {
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

// TYPE 5
class SimpleTextModule extends ElementModule {
  /**
   * Create module linked to pointer and element
   * @param {HTMLElement} parent - HTML element to render the text element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   * @param {string} tag - Tag for the text element in the module
   * @param {string} access - Name of the property the text content is stored in the element
   */
  constructor (parent, out, tag, access) {
    super(parent, out)
    Object.assign(this, { tag, access })
  }

  /**
   * Create text element
   */
  prebuild () { this.textInput = createElement({ parent: this.e, tag: this.tag }) }

  /**
   * Create internal pointer
   */
  postbuild () { this.int = new Pointer(this.textInput, this.access) }
}

/**
 * Module containing a single text input
 */

// TYPE 5
class TextInputModule extends SimpleTextModule {
  /**
   * Create module linked to pointer and element
   * @param {HTMLElement} parent - HTML element to render the text element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   */
  constructor (parent, out) { super(parent, out, 'input', 'value') }
}

/**
 * Module containing a single text area element
 */

// TYPE 5
class TextAreaModule extends SimpleTextModule {
  /**
   * Create module linked to pointer and element
   * @param {HTMLElement} parent - HTML element to render the text element in
   * @param {object} reference - Object reference to external pointer
   * @param {string} property - Name of the property in external pointer
   */
  constructor (parent, out) { super(parent, out, 'textarea', 'innerHTML') }
}

/**
 * Get a class for an editor for a name only type
 * @param {import('../../app/database.js').TypeName} type - Name of the type of the editor
 * @returns {NameOnlyEditor} Class for the editor of the type
 */

// TYPE 1
export function getNameOnlyEditor (type) {
  /**
   * Class for an editor that contains a single module which is a text input and only updates the name property inside the data object
   */
  class NameOnlyEditor extends ReceptorModule {
    modules () {
      return [
        [TextInputModule, `.${type}.data.name`]
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

// TYPE 3
class MoveableRowsModule extends ArrayModule {
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
  constructor (parent, out, element, childClass, divClass, options = {
    useDelete: true,
    useAdd: true
  }) {
    super(parent, out, element)

    this.divClass = divClass
    this.ChildClass = childClass
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

    // update id and save values

    const childModule = this.newchild(this.ChildClass, [], value, childElement)
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

  // TYPE 5
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

// TYPE 4
class LocalizationNameModule extends ObjectModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.e = createElement({ classes: ['hidden', 'localization-name'] })
  }

  prebuild () {
    this.parent.e.appendChild(this.e)
  }

  modules () {
    return [
      [TextInputModule, 'name'],
      [getReferenceSearchModule(), 'reference'],
      [TextAreaModule, 'translationNotes']
    ]
  }
}

// TYPE 4
class LocalizationNamesModule extends ObjectModule {
  initialize () {
    this.e = createElement({})
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
    this.langSelect = createElement({ parent: this.parent.e, tag: 'select', innerHTML: html })
    this.parent.e.appendChild(this.e)
  }

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

// TYPE 4
class SongNameModule extends ObjectModule {
  parentcss () { return 'name-row' }

  modules () {
    return [
      [TextInputModule, 'name'],
      [getReferenceSearchModule(), 'reference'],
      [LocalizationNamesModule, '']

      // ['name', TextInputModule, this.name, this.parent],
      // ['reference', getReferenceSearchModule()],
      // ['name', LocalizationNamesModule, this]
    ]
  }
}

/**
 * Module for editting a song author
 */

// TYPE 4
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

// type 6
class AudioFileModule extends ReadonlyModule {
  /**
   * Render the element
   */
  prebuild () {
    this.audioParent = createElement({ parent: this.e, innerHTML: generateAudio(this.out.read()) })
  }
}

// TYPE 4
class UnofficialNameModule extends ObjectModule {
  modules () {
    return [
      [TextInputModule, 'name'],
      [TextAreaModule, 'description']
    ]
  }
}

// TYPE 4
class SongVersionModule extends ObjectModule {
  modules () {
    return [
      [TextInputModule, 'name'],
      [TextAreaModule, 'description']
    ]
  }
}

// TYPE 5
class DateInputModule extends ElementModule {
  prebuild () {
    this.dateInput = createElement({ parent: this.e, tag: 'input', type: 'date' })
    this.int = new Pointer(this.dateInput, 'value')
  }
}

class SplitEditorModule extends ReceptorModule {
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

    // const modules = []
    // const expand = true
    // this.modules().forEach(module => {
    //   const header = module[0]
    //   const Class = module[1]
    //   const path = module[2]
    //   const args = module[3] || []
    //   const RowModule = getEditorRowModule(header, Class, expand, args)
    //   modules.push(
    //     new RowModule(this, Pointer.fromPath(this.r, path))
    //   )
    // })
    // return modules
  }
}

/**
 * Module for the song editor
 */

// TYPE 1
export class SongEditor extends SplitEditorModule {
  /**
   * Create children modules
   * @returns {EditorModule} List of children modules
   */
  parentcss () { return 'song-editor' }

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
      ['Date Composed', DateInputModule, song('composedDate')],
      ['External Release Date', DateInputModule, song('externalReleaseDate')]

      // ['names', getEditorRowModule('Names', MoveableRowsModule, true, [SongNameModule, 'name-div']), this.out.r.song.data, this.parent],
      // ['authors', getEditorRowModule('Authors', MoveableRowsModule, true, [SongAuthorModule, 'authors-div']), ...Array(2)],
      // ['link', getEditorRowModule('YouTube Link', TextInputModule, true)],
      // ['files', getEditorRowModule('Song Files', MoveableRowsModule, true, [AudioFileModule, 'audios-div', { useAdd: false, useDelete: false }])],
      // ['unofficialNames', getEditorRowModule('Unofficial Names', MoveableRowsModule, true, [UnofficialNameModule])],
      // ['swfMusicNumbers', getEditorRowModule('SWF Music IDs', MoveableRowsModule, true, [TextInputModule
      // ])],
      // ['firstParagraph', getEditorRowModule('First Paragraph', TextAreaModule, true)],
      // ['page', getEditorRowModule('Page Source Code', TextAreaModule, true)],
      // ['keySignatures', getEditorRowModule('Key Signatures', MoveableRowsModule, true, [getSearchQueryModule('key_signature')])],
      // ['genres', getEditorRowModule('Musical Genres', MoveableRowsModule, true, [getSearchQueryModule('genre')])],
      // ['categories', getEditorRowModule('Page Categories', MoveableRowsModule, true, [getSearchQueryModule('category')])],
      // ['versions', getEditorRowModule('Song Versions', MoveableRowsModule, true, [SongVersionModule])],
      // ['composedDate', getEditorRowModule('Date Composed', DateInputModule, true)],
      // ['externalReleaseDate', getEditorRowModule('External Release Date', DateInputModule, true)]
    ]
  }

  // modules () {
  //   return
  // }
}

/**
 * Module for the reference editor
 */

// TYPE 1
export class ReferenceEditor extends SplitEditorModule {
  modules () {
    const file = prop => `.wiki_reference.data.${prop}`
    return [
      ['Reference Name', TextInputModule, file('name')],
      ['Link to Reference (if needed)', TextInputModule, file('link')],
      ['Reference Description', TextAreaModule, file('description')]

      // ['name', TextInputModule, this.out.r.wiki_reference, this.parent],
      // ['link'],
      // ['description', TextAreaModule]
    ]
  }
}

/**
 * Module containing only a checkbox and having its checked property as the i/o data
 */

// TYPE 5
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

// TYPE 5
class FileUploadModule extends ElementModule {
  prebuild () {
    this.fileUpload = createElement({ parent: this.e, tag: 'input', type: 'file' })
  }

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

// TYPE 1
export class FileEditor extends SplitEditorModule {
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

      // ['source', getSearchQueryModule('source'), this.out.r.file.data, this.parent],
      // ['sourceLink', TextInputModule],
      // ['isHQ', CheckboxModule],
      // ['data', FileClass, this.out.r.file]
    ]
  }
}

function getEditorRowModule (header, ChildClass, useExpand, args = []) {
  // TYPE 2
  class EditorRowModule extends ConnectionModule {
    prebuild () {
      createElement({ parent: this.parent.e, innerHTML: header })
      const row = createElement({ parent: this.parent.e })
      if (useExpand) {
        this.expandButton = createElement({ parent: row, tag: 'button', innerHTML: 'expand' })
      }
      const childElement = createElement({ parent: row })
      this.childModule = new ChildClass(this, this.out, null, ...args)
      this.childModule.e = childElement
    }

    postbuild () {
      this.childModule.build()
      this.childModule.input()
    }

    presetup () {
      this.children.push(this.childModule)

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

/**
   * Generates HTML for an audio element based on a file
   * @param {Row} file
   * @returns {string}
   */
function generateAudio (file) {
  const name = file.original_name || file.originalname || ''
  const filePath = file.file_name || file.filename || ''
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
        <audio src="../music/${filePath}" controls data-name="${name}"></audio>
      `
  }
  return '<div>Could not load</div>'
}

/*

changes to be done:
will start using parent MODULE instead of parent HTML element
div element associated with module

** Receptor Module (type 1)
* Only has one constructor argument: the out pointer reference (no property and no parent element)
* HTML element is the topmost element for the editor
* methods only for running the children

* Connection Module (type 2)
* Arguments: parent module and pointer to pass over

/*

types of modules in terms of input output

1. editor module/topmost parent module -> only take out, passes down to modules
2. container modules only pass the out pointer from the parent to the children
3-> array modules create a map to pass down to the children, and transforms that into an array when outputing
4-> object modules define int pointing to own property and pass own properties to children
5-> HTML modules point to things on the page
6-> read data only, no output

output for each number

1. just calls every children
2. just calls every child
3. calls every child, build array and output
4. call every child, pass own object to output
5. get input and output to parent object

1. Receptor Module
2. Connection Module
3. Array Module
4. Object Module
5. Element Module
6. Readonly Module

 Array module
*/
