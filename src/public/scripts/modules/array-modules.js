import { createElement, selectElement } from '../utils.js'
import { ArrayModule } from './main-modules.js'

/**
 * Class for a module that lets the user manage the modules of an array module through the UI
 * allowing to move them (order them), as well as possibly adding and deleting new modules
 */
export class MoveableRowsModule extends ArrayModule {
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
    this.div = createElement({ parent: this.e, classes: [this.divClass, 'moveable-row-div'] })
    if (this.options.useAdd) {
      this.addButton = createElement({ parent: this.div, tag: 'button', innerHTML: 'ADD' })
    }
  }

  /**
   * Renders all the rows with the user data
   */
  postbuild () { 
    // fix running into issude with moveable row modules children of moveable row modules
    if (!this.out.read()) this.out.assign([])
    this.out.read().forEach(row => this.addRow(row))
  }

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
    // if no value means it's being added via the add row button and not
    // from building the page, which prevents setup being run twice, once here and
    // once by the parent calling all children
    if (!value) childModule.setup()

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
 * Module that represents a grid where children modules can be placed in a row-column orientation
 * and the UI lets the user edit the number of rows and columns,
 * and outputs the data as a two dimensional array
 */
export class GridModule extends ArrayModule {
  /**
   * @param {BaseModule} parent
   * @param {Pointer} out
   * @param {HTMLElement} element
   * @param {BaseModule} ChildClass
   */
  constructor (parent, out, element, ChildClass) {
    super(parent, out, element, ChildClass)
    Object.assign(this, { ChildClass })

    // control the grid dimensions
    this.rows = 0
    this.columns = 1

    this.names = ['row', 'column']
    this.actions = ['add', 'remove']
  }

  /**
   * Add a new row or column
   * @param {any[]} values - Values to be passed down to the modules of the column/row
   * @param {number} index - 0 for 'row' and 1 for 'column'
   * @param {function(any[]) : void} callbackfn - Takes as arguments the values argument of this function, and adds a new element to the grid
   */
  addNew (values = [], index, callbackfn) {
    const name = this.pluralize(this.names[index])
    const otherName = this.pluralize(this.names[index ? 0 : 1])
    this[name]++
    for (let i = 0; i < this[otherName]; i++) {
      const newElement = callbackfn(i)
      const child = this.newchild(values[i], newElement)
      child.build()
      child.setup()
    }
  }

  /**
   * Add a new row
   * @param {any[]} values - Values to be passed down to the modules of the row
   */
  addRow (values) {
    this.addNew(values, 0, () => createElement({ parent: this.grid }))
  }

  /**
   * Add a new column
   * @param {any[]} values - Values to be passed down to the modules of the column
   */
  addColumn (values) {
    this.addNew(values, 1, i => {
      const newElement = createElement({})
      this.grid.children[this.columns - 2 + i * this.columns].insertAdjacentElement('afterend', newElement)
      return newElement
    })
  }

  /**
   * Remove the last row
   */
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

  /**
   * Remove the last column
   */
  removeColumn () {
    // minimum is 1
    if (this.columns > 1) {
      for (let i = this.grid.children.length - 1; i > 0; i -= this.columns) {
        this.grid.removeChild(this.grid.children[i])
      }
      this.columns--
    }
  }

  /**
   * Updates the CSS for the grid
   */
  setTemplate () {
    this.names.forEach(name => {
      this.grid.style[`gridTemplate${this.capitalpluralize(name)}`] = `repeat(${this[this.pluralize(name)]}, 1fr)`
    })
  }

  /**
   * Renders the HTML elements
   */
  prebuild () {
    this.grid = createElement({ parent: this.e })
    this.grid.style.display = 'grid'
    this.actions.forEach(action => {
      this.names.forEach(name => {
        const capitalized = this.capitalize(name)
        this[`${action}${capitalized}Button`] = createElement({ parent: this.e, tag: 'button', innerHTML: `${this.capitalize(action)} ${capitalized}` })
      })
    })
  }

  /**
   * Add new rows and columns according to the data inputted, if any
   */
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

  /**
   * Add control to the buttons
   */
  presetup () {
    this.actions.forEach(action => {
      this.names.forEach(name => {
        const capitalized = this.capitalize(name)
        this[`${action}${capitalized}Button`].addEventListener('click', () => {
          this[`${action}${capitalized}`]()
          this.setTemplate()
        })
      })
    })
  }

  /**
   * Get the two dimensional array from the grid values and pass to output
   */
  postmidoutput () {
    const gridArray = []
    for (let i = 0; i < this.rows; i++) {
      const removed = this.array.splice(0, this.columns)
      gridArray.push(removed)
    }
    this.array = gridArray
  }

  /**
   * Adds 's' to the end of a string
   * @param {string} str - String to modify
   * @returns Modified string
   */
  pluralize (str) {
    return `${str}s`
  }

  /**
   * Makes the first letter of a string uppercase
   * @param {string} str - String to modify
   * @returns Modified string
   */
  capitalize (str) {
    return `${str[0].toUpperCase()}${str.slice(1)}`
  }

  /**
   * Makes the first letter of a string uppercase and 's' to the end of it
   * @param {string} str - String to modify
   * @returns Modified string
   */
  capitalpluralize (str) {
    return this.pluralize(this.capitalize(str))
  }
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
