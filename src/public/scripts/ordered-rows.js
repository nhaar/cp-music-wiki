import { createElement } from './utils.js'

export class OrderedRowsElement {
  /**
   * Creates the element using divClass as the element class,
   * and idClass are assigned to all row headers
   * @param {string} divClass
   * @param {string} idClass
   */
  constructor (divClass, idClass, templateHTML) {
    this.rowClass = 'ordered-row'
    this.headerClass = 'row-header'
    this.delClass = 'delete-button'
    this.identifierClass = idClass

    this.div = createElement({ className: divClass })
    this.rowsDiv = createElement({ parent: this.div })
    this.newRowDiv = createElement({ parent: this.div, className: 'add-ordered-row' })
    this.addButton = createElement({ parent: this.newRowDiv, tag: 'button', innerHTML: 'ADD' })

    this.addTemplate = createElement({ parent: this.newRowDiv, innerHTML: templateHTML })
    this.template = templateHTML
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
   * @param {function(OrderedRowsElement) : void} addCallback - A function to call every time a row is added (also runs when the element is created)
   */
  setupAddRow (
    setupTemplate,
    getDataFunction,
    contentFunction,
    sortValueFunction,
    addCallback
  ) {
    if (setupTemplate) this.setupTemplate = () => setupTemplate(this.addTemplate)
    this.getDataFunction = getDataFunction
    this.contentFunction = contentFunction
    this.sortValueFunction = sortValueFunction
    this.addCallback = addCallback

    if (addCallback) addCallback(this)

    if (setupTemplate) this.setupTemplate()
    this.addButton.addEventListener('click', () => {
      this.createNewRow()
    })
  }

  /**
   * Creates a new row where the header is the name and adds the data variable as the id
   * @param {string} name
   * @param {string} id
   */
  createNewRow () {
    const data = this.getDataFunction(this.addTemplate)

    // reset input
    this.addTemplate.innerHTML = this.template
    if (this.setupTemplate) this.setupTemplate()

    const newRow = createElement({ parent: this.rowsDiv, classes: [this.rowClass, this.identifierClass] })
    const contentDiv = createElement({ parent: newRow })
    this.contentFunction(contentDiv, data)
    const delButton = createElement({ parent: newRow, className: this.delClass, innerHTML: 'DELETE', tag: 'button' })
    delButton.addEventListener('click', () => {
      this.rowsDiv.removeChild(newRow)
    })

    this.sortRows()
    contentDiv.addEventListener('mouseout', () => this.sortRows())
    if (this.addCallback) this.addCallback(this)
  }

  sortRows () {
    const rows = this.rowsDiv.children
    const rowsArray = Array.from(rows)
    while (this.rowsDiv.firstChild) {
      this.rowsDiv.removeChild(this.rowsDiv.firstChild)
    }

    rowsArray.sort((a, b) => {
      return this.sortValueFunction(a) - this.sortValueFunction(b)
    })

    rowsArray.forEach(element => {
      this.rowsDiv.appendChild(element)
    })
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
