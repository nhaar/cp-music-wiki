import { createSearchQuery } from "./query-options.js"
import { createElement, selectElement } from "./utils.js"

class EditorModule {
  constructor (parent, reference, property) {
    Object.assign(this, { parent })
    this.refOne = reference
    this.propOne = property
    this.modules = this.createModules()
  }

  createModules () {
    return []
  }

  build () {
    this.modules.forEach(module => module.build())
  }

  input () {
    const { refTwo } = this
    if (refTwo) {
      refTwo[this.propTwo] = this.refOne[this.propOne]
    }
    this.modules.forEach(module => module.input())
  }

  setup () {
    this.modules.forEach(module => module.setup())
  }

  callbackfn () {

  }

  output () {
    this.modules.forEach(module => module.output())
    this.callbackfn()
    const { refTwo } = this
    if (refTwo) {
      this.refOne[this.propOne] = refTwo[this.propTwo]
    }
    return this.refOne
  }
}

export class TextInputModule extends EditorModule {
  build () {
    this.textInput = createElement({ parent: this.parent, tag: 'input'})
    this.refTwo = this.textInput
    this.propTwo = 'value'
  }
}

class TextAreaModule extends EditorModule {
  build () {
    this.textArea = createElement({ parent: this.parent, tag: 'textarea' })
    this.refTwo = this.textArea
    this.propTwo = 'innerHTML'
  }
}

export function nameOnlyEditor (type) {
  class NameEditor extends EditorModule {
    createModules () {
      return [
        new TextInputModule(this.parent, this.refOne[type].data, 'name')
      ]
    }
  } 

  return NameEditor
}

// export function moveableRowsEditor (childModule, options = {
//   useDelete: true,
//   useAdd: true
// }) {
//   class MoveableRowsEditor extends MoveableRowsModule {
//     constructor (parent, reference, property) {
//       super(parent, reference, property, childModule, options)
//     }
//   }

//   return MoveableRowsEditor
// }



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


class MoveableRowsModule extends EditorModule {
  constructor (parent, reference, property, childModule, options = {
    useDelete: true,
    useAdd: true
  }) {
    super(parent, reference, property)

    
    this.childModule = childModule
    this.options = options

    this.rowClass = 'moveable-row'
    this.delClass = 'del-button'
    this.moveClass = 'move-button'
    this.contentClass = 'row-content'
  }

  build () {
    this.seq = 0
    this.indexValue = {}


    this.rowsDiv = createElement({ parent: this.parent })
    if (this.options.useAdd) {
      this.addButton = createElement({ parent: this.rowsDiv, tag: 'button', innerHTML: 'ADD'})
    }
    this.data = []
    this.refTwo = this
    this.propTwo = 'data'

    this.refOne[this.propOne].forEach(row => {
      this.addRow(row)
    })
  }

  setup () {
    if (this.options.useAdd) {
      this.setupAddButton()
    }
    this.setupMoving()
  }
  
  callbackfn () {

    this.data = []
    const rows = Array.from(this.rowsDiv.children).filter(child => child.tagName === 'DIV')
    rows.forEach(row => {
      this.data.push(this.indexValue[row.dataset.seq])
    })
  }

  /**
   * Adds control to the add row button
   */
  setupAddButton () {
    this.addButton.addEventListener('click', () => {
      // const innerHTML = this.generateRow(this.defaultValue)
      this.addRow()
    })
  }

  addRow (value) {
    console.log(value)
    const newRow = createElement({ })
    const childElement = createElement({ parent: newRow })
    createElement({ parent: newRow, tag: 'button', className: this.delClass, innerHTML: 'DELETE' })
    createElement({ parent: newRow, tag: 'button', className: this.moveClass, innerHTML: 'MOVE' })
    this.seq++
    newRow.dataset.seq = this.seq
    this.indexValue[this.seq] = value
    const newModule = new this.childModule(childElement, this.indexValue, this.seq + '')
    newModule.build()
    this.modules.push(newModule)
    this.addButton.parentElement.insertBefore(newRow, this.addButton)
    this.setupRow(newRow)
  }

  /**
   * Adds control to a moveable row
   * @param {HTMLDivElement} row
   */
  setupRow (row) {
    // delete row
    if (this.options.useDelete) {
      selectElement(this.delClass, row).addEventListener('click', () => {
        this.rowsDiv.removeChild(row)
      })
    }

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

  
  /**
   * Adds control to all the current moveable rows
   */
  setupMoving () {
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
}

function newSearchQueryModule (parent, property, reference, type) {
  class SearchQueryModule extends EditorModule {
    build () {
      this.inputElement = createElement({ parent: this.parent, tag: 'input'})
      createSearchQuery(
        this.inputElement,
        type
      )
      this.refTwo = this.inputElement.dataset
      this.propTwo = 'id'
    }

    output () {
      super.output()
      const id = this.refTwo[this.propTwo]
      this.refOne[this.propOne] = id ? Number(id) : null
    }
  }

  return new SearchQueryModule(parent, property, reference)
}


export class TestEditor extends MoveableRowsModule {
  constructor (parent, reference) {
    super(parent, reference.author.data, 'name', TextInputModule)
  }
} 

class LocalizationNameModule extends EditorModule {
  createModules () {
    this.data = this.refOne[this.propOne]
    this.refTwo = this
    this.propTwo = 'data'
    return [
      new TextInputModule(this.parent, this.data, 'name'),
      new newSearchQueryModule(this.parent, this.data, 'reference', 'wiki_reference'),
      new TextAreaModule(this.parent, this.data, 'translationNotes')
    ]
  }

  output () {
    super.output()
  }
}

class SongNameModule extends EditorModule {
  build () {
    console.log(this.modules)
    super.build()
    this.refTwo = this
    this.propTwo = 'name'
  }

  createModules () {
    this.name = this.refOne[this.propOne]
    console.log(this.name)

    return [
      new TextInputModule(this.parent, this.name, 'name'),
      new newSearchQueryModule(this.parent, this.name, 'reference', 'wiki_reference'),
      new LocalizationNameModule(this.parent, this.name, 'pt'),
      new LocalizationNameModule(this.parent, this.name, 'fr'),
      new LocalizationNameModule(this.parent, this.name, 'es'),
      new LocalizationNameModule(this.parent, this.name, 'de'),
      new LocalizationNameModule(this.parent, this.name, 'ru')
    ]
  }
}

export class SongEditor extends EditorModule {
  createModules () {
    console.log (this.refOne.song.data)
    return [
      new MoveableRowsModule(this.parent, this.refOne.song.data, 'names', SongNameModule)
    ]
  }
}

export class ReferenceEditor extends EditorModule {
  createModules () {
    const data = this.refOne.wiki_reference.data
    const parent = this.parent
    return [
      new TextInputModule(parent, data, 'name'),
      new TextInputModule(parent, data, 'link'),
      new TextAreaModule(parent, data, 'description')
    ]
  }
}