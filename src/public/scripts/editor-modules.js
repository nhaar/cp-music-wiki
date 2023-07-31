import { createSearchQuery } from './query-options.js'
import { createElement, selectElement, selectElements, styleElement } from './utils.js'

/**
 * A pointer representation to a variable
 *
 * It consists of using the reference to an object and reserving a property inside the object
 */
class Pointer {
  /**
   * Define pointer in object with property name
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
 * The base class for the modules
 *
 * It contains the four main methods as well as the base method for getting modules
 */
class BaseModule {
  /**
   * Get all the predefined children for a module
   *
   * The module are defined in the `modules` method, and
   * the definitions are processed into the actual module via
   * the `constructModule` method
   * @returns {BaseModule[]} Array with all the children
   */
  getmodules () {
    const children = []
    this.modules().forEach(module => {
      // define pointer if there is a property
      if (typeof module.property === 'string') {
        module.childOut = module.property
          ? new Pointer(this.out.read(), module.property)
          : this.out
      }
      children.push(this.constructModule(module))
    })
    return children
  }

  /**
   * Placeholder method
   * @returns {undefined}
   */
  constructModule () { return undefined }

  /**
   * Placeholder method returning empty list
   * @returns {BaseModule[]} Empty list
   */
  modules () { return [] }

  /**
   * Method for rendering HTML elements
   *
   * It calls the `prebuild` and `postbuild` methods,
   * and between those two it calls `build` for all of the children
   */
  build () {
    if (this.prebuild) this.prebuild()
    this.iterateChildren('build')
    if (this.postbuild) this.postbuild()
  }

  /**
   * Method for inputting the data from database onto the page
   *
   * It calls the `preinput` method, and then if `int` exists
   * converts it with the `convertinput` method if it exists as well,
   * after which it calls `input` for all the children
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
   *
   * Calls `setup` for all the children, can call code before it with `presetup`
   */
  setup () {
    if (this.presetup) this.presetup()
    this.iterateChildren('setup')
  }

  /**
   * Method for outputting the data in the page to the backend
   *
   * Calls the `middleoutput`, `postmidoutput`, after calling `output` to all the children,
   * ends converting with `convertoutput` if necessary and then running `postoutput`
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
    this.out = new Pointer(this, 'r')
    this.e = element
    this.children = this.getmodules()
  }

  constructModule (o) {
    return new o.Class(this, o.path, null, ...o.args)
  }
}

/**
 * The class for the modules that serve only as a bridge for the data coming from the parent module to the children modules,
 * as such it contains no internal pointer
 */
class ConnectionModule extends ChildModule {
  constructModule (o) {
    return new o.Class(this.parent, this.out, null, ...o.args)
  }
}

/**
 * Modules that handle array data, having an arbitrary number of modules all of the same type
 */
class ArrayModule extends ChildModule {
  /**
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

  // /**
  //  * Add a new child to the array
  //  * @param {Class} ChildClass Constructor for the child module
  //  * @param {*[]} args - List of arbitrary arguments for the constructor
  //  * @param {*} value - Value to give to the data in the array
  //  * @param {HTMLElement} element - HTML element to give to the child
  //  * @returns {ChildModule} - The created child
  //  */

  /**
   * Add a new child to the array module
   * @param {*} value - Value to initialize the element's pointer to
   * @param {HTMLElement} element - HTML element to bind child
   * @param  {...any} args - Arbitrary arguments for the child constructor
   * @returns {BaseModule} Reference to new child
   */
  newchild (value, element, ...args) {
    this.seq++
    this.map[this.seq] = value

    // identify element for output
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
 * Class for a module that represents an object,
 * with each child being a property of the object
 */
class ObjectModule extends ChildModule {
  /**
   * Creates the object in the external data if it doesn't exists
   */
  earlyinit () {
    if (!this.out.read()) this.out.assign({})
  }

  constructModule (o) {
    return new o.Class(this, o.childOut, null, ...o.args)
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
 * Object with the data for child modules in `TableModule` and `EditorModule`
 */
class TableChild {
  /**
   * @param {string} header - Header for the the module's row
   * @param {BaseModule} Class - Module constructor
   * @param {string} property - Property in the pointer to access
   * @param  {...any} args - Arbitrary arguments for the constructor
   */
  constructor (header, Class, property, ...args) {
    Object.assign(this, { header, Class, property, args })
  }
}

/**
 * Module representing a table containing rows where each row
 * contains a name and a module
 */
class TableModule extends ObjectModule {
  constructModule (o) {
    const TableClass = getHeaderRowModule(o.header, o.Class, o.args)
    return new TableClass(this, o.childOut)
  }
}

/**
 * Module containing a single text element
 */
class SimpleTextModule extends ElementModule {
  /**
   *
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   * @param {string} tag - Tag for HTML element
   * @param {string} access - Property for the output
   * @param {string} entry - Property for the input
   * @param {string} type - Type for the HTML element
   */
  constructor (parent, out, element, tag, access, entry, type) {
    super(parent, out, element)
    Object.assign(this, { tag, access, entry, type })
  }

  /**
   * Create text element
   */
  prebuild () {
    this.textInput = createElement({ parent: this.e, tag: this.tag, type: this.type })
    this.int = new Pointer(this.textInput, this.entry)
  }

  /**
   * Retrieve data
   */
  middleoutput () { this.int = new Pointer(this.textInput, this.access) }

  /**
   * Set default value for the input
   * @param {*} input Input value
   * @returns {string} Converted value
   */
  convertinput (input) { return input || '' }
}

/**
 * Module containing a single HTML text input
 */
class TextInputModule extends SimpleTextModule {
  /**
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   */
  constructor (parent, out, element) { super(parent, out, element, 'input', 'value', 'value') }
}

/**
 * Module containing a single text area HTML element
 */
class TextAreaModule extends SimpleTextModule {
  /**
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   */
  constructor (parent, out, element) { super(parent, out, element, 'textarea', 'value', 'innerHTML') }
}

/**
 * Module containing a single number input HTML element
 */
class NumberInputModule extends SimpleTextModule {
  /**
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   */
  constructor (parent, out, element) { super(parent, out, element, 'input', 'value', 'value', 'number') }

  /**
   * To convert any value into a number
   * @param {*} output
   * @returns {number} Converted value
   */
  convertoutput (output) { return Number(output) }
}

/**
 * Module containing a select HTML element with options
 */
class OptionSelectModule extends ElementModule {
  /**
   *
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   * @param {object} options - Object where each key represents an option HTML element where the key is the innerHTML and the value is the element value
   */
  constructor (parent, out, element, options) {
    super(parent, out, element)

    Object.assign(this, { options })
  }

  /**
   * Render select element
   */
  prebuild () {
    this.selectElement = createElement({ parent: this.e, tag: 'select' })
    createElement({ parent: this.selectElement, tag: 'option', value: '' })
    for (const option in this.options) {
      const value = this.options[option]
      createElement({ parent: this.selectElement, tag: 'option', value, innerHTML: option })
    }
    this.int = new Pointer(this.selectElement, 'value')
  }

  /**
   * Expect the value output to be a number
   * @param {*} output
   * @returns {number} - Converted output
   */
  convertoutput (output) { return Number(output) }
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
 * Class for a module that lets the user manage the modules of an array module through the UI
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
    const childModule = this.newchild(value, childElement)
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

    this.names = ['row', 'column']
    this.pluralNames = this.names.map(name => `${name}s`)
    const capitalize = x => `${x[0].toUpperCase()}${x.slice(1)}`
    this.capitalizedNames = this.names.map(name => capitalize(name))
    this.capitalizedPlural = this.pluralNames.map(name => capitalize(name))
  }

  addNew (values = [], index, callbackfn) {
    const name = this.pluralNames[index]
    const otherName = this.pluralNames[index ? 0 : 1]
    console.log(name, otherName)
    this[name]++
    for (let i = 0; i < this[otherName]; i++) {
      const newElement = callbackfn(i)
      const child = this.newchild(values[i], newElement)
      child.build()
      child.setup()
    }
    this.setTemplate(index)
  }

  addRow (values) {
    this.addNew(values, 0, () => createElement({ parent: this.grid }))
  }

  addColumn (values) {
    this.addNew(values, 1, i => {
      const newElement = createElement({})
      this.grid.children[i * 2].insertAdjacentElement('afterend', newElement)
      return newElement
    })
  }

  removeRow () {
    // don't remove if at 0
    if (this.rows > 0) {
      this.rows--
      const removePos = this.columns * this.rows
      for (let i = 0; i < this.columns; i++) {
        this.grid.removeChild(this.grid.children[removePos])
      }
    }
  }

  setTemplate (index) {
    this.grid.style[`gridTemplate${this.capitalizedPlural[index]}`] = `repeat(${this[this.pluralNames[index]]}, 1fr)`
  }

  prebuild () {
    this.grid = createElement({ parent: this.e })
    this.grid.style.display = 'grid'
    this.names.forEach(name => {
      this[`${name}Button`] = createElement({ parent: this.e, tag: 'button', innerHTML: `Add ${name}` })
    })
    this.removeRowButton = createElement({ parent: this.e, tag: 'button', innerHTML: 'Remove row' })
  }

  postbuild () {
    const grid = this.out.read()
    if (grid.length) {
      const firstRow = grid[0]
      this.columns = firstRow.length
      this.setTemplate(1)
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
    this.names.forEach((name, i) => {
      this[`${name}Button`].addEventListener('click', () => {
        const capitalized = this.capitalizedNames[i]
        console.log(this, `add${capitalized}`)
        this[`add${capitalized}`]()
        console.log(this.rows, this.columns)
      })
    })

    this.removeRowButton.addEventListener('click', () => {
      this.removeRow()
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
class LocalizationNameModule extends TableModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.e = createElement({ parent: this.e, classes: ['hidden', 'localization-name', 'header-row'] })
  }

  modules () {
    return [
      new TableChild('Localized Name', TextInputModule, 'name'),
      new TableChild('Name Reference', getReferenceSearchModule(), 'reference'),
      new TableChild('Translation Notes', TextAreaModule, 'translationNotes')
    ]
  }
}

/**
 * Information for defining a child module in an `ObjectModule`
 */
class ObjectChild {
  /**
   * @param {Class} Class - Module constructor
   * @param {string} property - Property to access in the pointer
   * @param  {...any} args - Arbitrary arguments for the constructor
   */
  constructor (Class, property, ...args) {
    Object.assign(this, { Class, property, args })
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
    this.bridge = this.e
    this.e = createElement({})
  }

  /**
   * Add language select and element
   */
  prebuild () {
    const html = `
      <option selected> [PICK LANGUAGE] </option>
      <option value="0"> Portuguese </option>
      <option value="1"> French </option>
      <option value="2"> Spanish </option>
      <option value="3"> German </option>
      <option value="4"> Russian </option>
    `
    this.selectDiv = createElement({ parent: this.bridge, className: 'language-select' })
    createElement({ parent: this.selectDiv, innerHTML: 'Language' })
    this.langSelect = createElement({ parent: this.selectDiv, tag: 'select', innerHTML: html })
    this.bridge.appendChild(this.e)
  }

  /**
   * Add control to the language select
   */
  presetup () {
    this.langSelect.addEventListener('change', () => {
      const langNamesDiv = this.e
      const targetElement = langNamesDiv.children[Number(this.langSelect.value)]
      const previousElement = langNamesDiv.querySelector(':scope > div:not(.hidden)')

      if (previousElement) previousElement.classList.add('hidden')
      if (targetElement) targetElement.classList.remove('hidden')
    })
  }

  modules () {
    return [
      new ObjectChild(LocalizationNameModule, 'pt'),
      new ObjectChild(LocalizationNameModule, 'fr'),
      new ObjectChild(LocalizationNameModule, 'es'),
      new ObjectChild(LocalizationNameModule, 'de'),
      new ObjectChild(LocalizationNameModule, 'ru')
    ]
  }
}

/**
 * Module for editting a song name (official)
 */
class SongNameModule extends TableModule {
  /**
   * Style row
   */
  initialize () { styleElement(this.e, 'name-row', 'header-row') }

  modules () {
    return [
      new TableChild('Main Name', TextInputModule, 'name'),
      new TableChild('Name Reference', getReferenceSearchModule(), 'reference'),
      new TableChild('Localization Name', LocalizationNamesModule, '')
    ]
  }
}

/**
 * Module for editting a song author
 */
class SongAuthorModule extends TableModule {
  prebuild () { styleElement(this.e, 'grid', 'header-row') }

  modules () {
    return [
      new TableChild('Author Name', getSearchQueryModule('author'), 'author'),
      new TableChild('Reference', getReferenceSearchModule(), 'reference')
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
class UnofficialNameModule extends TableModule {
  prebuild () { styleElement(this.e, 'header-row', 'grid') }

  modules () {
    return [
      new TableChild('Name', TextInputModule, 'name'),
      new TableChild('Description', TextAreaModule, 'description')
    ]
  }
}

/**
 * Module for a song version object
 */
class SongVersionModule extends TableModule {
  prebuild () { styleElement(this.e, 'header-row', 'grid') }
  modules () {
    return [
      new TableChild('Version Name', TextInputModule, 'name'),
      new TableChild('Description', TextAreaModule, 'description')
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

class EstimateCheckboxModule extends CheckboxModule {
  prebuild () {
    styleElement(this.e, 'date-estimate')
    this.div = createElement({ parent: this.e, className: 'is-estimate' })
    this.text = createElement({ parent: this.div, innerHTML: 'Is estimate?' })
    this.checkbox = createElement({ parent: this.div, tag: 'input', type: 'checkbox' })
  }
}

class DateEstimateModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(DateInputModule, 'date'),
      new ObjectChild(EstimateCheckboxModule, 'isEstimate')
    ]
  }
}

class TimeRangeModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(DateEstimateModule, 'start'),
      new ObjectChild(DateEstimateModule, 'end')
    ]
  }
}

/**
 * Base class for the top module of an editor
 */
class EditorModule extends ReceptorModule {
  constructModule (o) {
    const RowModule = getEditorRowModule(o.header, o.Class, true, ...o.args)
    return new RowModule(this, o.childOut)
  }
}

/**
 * Class for an editor that contains a single module which is a text input
 * and only updates the name property inside the data object
 */
export class NameOnlyEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Name', TextInputModule, 'name')
    ]
  }
}

class SongFileEditor extends ObjectModule {
  modules () {
    const lastClass = this.out.read().originalname
      ? AudioFileModule
      : FileUploadModule

    return [
      new ObjectChild(getSearchQueryModule('source'), 'source'),
      new ObjectChild(TextInputModule, 'link'),
      new ObjectChild(CheckboxModule, 'isHQ'),
      new ObjectChild(lastClass, '')
    ]
  }
}

/**
 * Module for the song editor
 */
export class SongEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Names', MoveableRowsModule, 'names', SongNameModule, 'name-div'),
      new TableChild('Authors', MoveableRowsModule, 'authors', SongAuthorModule, 'authors-div'),
      new TableChild('Youtube Link', TextInputModule, 'link'),
      new TableChild('Song Files', MoveableRowsModule, 'files', SongFileEditor, 'audios-div'),
      new TableChild('Unofficial Names', MoveableRowsModule, 'unofficialNames', UnofficialNameModule),
      new TableChild('SWF Music IDs', MoveableRowsModule, 'swfMusicNumbers', NumberInputModule),
      new TableChild('First Paragraph', TextAreaModule, 'firstParagraph'),
      new TableChild('Page Source Code', TextAreaModule, 'page'),
      new TableChild('Key Signatures', MoveableRowsModule, 'keySignatures', getSearchQueryModule('key_signature')),
      new TableChild('Musical Genres', MoveableRowsModule, 'genres', getSearchQueryModule('genre')),
      new TableChild('Page Categories', MoveableRowsModule, 'categories', getSearchQueryModule('category')),
      new TableChild('Song Versions', MoveableRowsModule, 'versions', SongVersionModule),
      new TableChild('Date Composed', DateEstimateModule, 'composedDate'),
      new TableChild('External Release Date', DateInputModule, 'externalReleaseDate')
    ]
  }
}

/**
 * Module for the reference editor
 */
export class ReferenceEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Reference Name', TextInputModule, 'name'),
      new TableChild('Link to Reference (if needed)', TextInputModule, 'link'),
      new TableChild('Reference Description', TextAreaModule, 'description')
    ]
  }
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
      new TableChild('File Song', getSearchQueryModule('song'), 'song'),
      new TableChild('File Source', getSearchQueryModule('source'), 'source'),
      new TableChild('Link to Source (if needed)', TextInputModule, 'link'),
      new TableChild('Is it HQ?', CheckboxModule, 'isHQ'),
      new TableChild(fileHeader, FileClass, '')
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
function getEditorRowModule (header, ChildClass, useExpand, ...args) {
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

function getHeaderRowModule (header, ChildClass, ...args) {
  return getEditorRowModule(header, ChildClass, false, ...args)
}

export class GenreEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Genre Name', TextInputModule, 'name'),
      new TableChild('External Link', TextInputModule, 'link')
    ]
  }
}

export class InstrumentEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Instrument Name', TextInputModule, 'name'),
      new TableChild('External Link', TextInputModule, 'link')
    ]
  }
}

export class KeysigEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Key Signature Name', TextInputModule, 'name'),
      new TableChild('External Link', TextInputModule, 'link')
    ]
  }
}

export class PageEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Page Title', TextInputModule, 'name'),
      new TableChild('Content', TextAreaModule, 'content'),
      new TableChild('Categories', MoveableRowsModule, 'categories', getSearchQueryModule('category'))
    ]
  }
}

class SongAppearanceModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(TimeRangeModule, 'available'),
      new ObjectChild(getSearchQueryModule('song'), 'song'),
      new ObjectChild(getReferenceSearchModule(), 'reference')
    ]
  }
}

export class FlashroomEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Room Name', TextInputModule, 'name'),
      new TableChild('Time period the room was open', TimeRangeModule, 'open'),
      new TableChild('Songs uses in the room', MoveableRowsModule, 'songUses', SongAppearanceModule)
    ]
  }
}

class PartySongModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(OptionSelectModule, 'type', {
        Room: 1,
        Minigame: 2
      }),
      new ObjectChild(CheckboxModule, 'usePartyDate'),
      new ObjectChild(TimeRangeModule, 'available'),
      new ObjectChild(getSearchQueryModule('song'), 'song')
    ]
  }
}

export class FlashpartyEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Party Name', TextInputModule, '.name'),
      new TableChild('Period the party was actiuve', TimeRangeModule, 'active'),
      new TableChild('Songs used in the party', MoveableRowsModule, 'partySongs', PartySongModule)
    ]
  }
}

class CatalogueItemModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(TextInputModule, 'displayName'),
      new ObjectChild(getSearchQueryModule('song'), 'song')
    ]
  }
}

export class MuscatalogEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Catalogue Title', TextInputModule, 'name'),
      new TableChild('Catalogue Notes', TextAreaModule, 'description'),
      new TableChild('Catalogue Date', DateEstimateModule, 'date'),
      new TableChild('Song List', GridModule, 'songs', CatalogueItemModule),
      new TableChild('Catalogue Reference', getReferenceSearchModule(), 'reference')
    ]
  }
}

class StageAppearanceModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(TimeRangeModule, 'appearance'),
      new ObjectChild(getReferenceSearchModule(), 'reference')
    ]
  }
}

export class StageEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Stage Play Name', TextInputModule, 'name'),
      new TableChild('Play Theme Song', getSearchQueryModule('song'), 'song'),
      new TableChild('Play Debuts', MoveableRowsModule, 'appearances', StageAppearanceModule)
    ]
  }
}

class MinigameSongModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(getSearchQueryModule('song'), 'song'),
      new ObjectChild(CheckboxModule, 'useMinigameDates'),
      new ObjectChild(TimeRangeModule, 'available')
    ]
  }
}

export class FlashgameEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Minigame Name', TextInputModule, 'name'),
      new TableChild('Time period game is playable', TimeRangeModule, 'available'),
      new TableChild('Minigame songs', MoveableRowsModule, 'songs', MinigameSongModule)
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
