import { generateAudio } from './file.js'
import { createSearchQuery } from './query-options.js'
import { createElement, selectElement } from './utils.js'

class Pointer {
  constructor (reference, property) {
    this.r = reference
    this.p = property
   }

  assign (value) { this.r[this.p] = value }

  read = () => this.r[this.p]

  exchange (pointer) { pointer.assign(this.read()) }
}

class EditorModule {
  constructor (parent, reference, property) {
    Object.assign(this, { parent })
    this.out = new Pointer(reference, property)
    this.modules = this.createModules()
  }

  createModules () { return [] }

  iterateModules (fn) { console.log('hello', this.modules); this.modules.forEach(module => {
    console.log(module)
    module[fn]()
  }) }
  

  build () { this.iterateModules('build') }

  input () {
    const { int } = this 
    if (int) this.out.exchange(int)
    this.iterateModules('input')
  }

  setup () { this.iterateModules('setup') }

  callbackfn () {}

  output () {
    this.iterateModules('output')
    this.callbackfn()
    const { int, out } = this
    if (int) int.exchange(out)
    return int.r
  }
}

export class TextInputModule extends EditorModule {
  build () { this.textInput = createElement({ parent: this.parent, tag: 'input' }) }

  input () {
    this.int = new Pointer(this.textInput, 'value')
    super.input()
  }
}

class TextAreaModule extends EditorModule {
  build () { this.textArea = createElement({ parent: this.parent, tag: 'textarea' }) }

  input () {
    this.int = new Pointer(this.textArea, 'innerHTML')
    super.input()
  }
}

export function nameOnlyEditor (type) {
  class NameEditor extends EditorModule {
    createModules () { return [
      new TextInputModule(this.parent, this.out.r[type].data, 'name')
    ]}
  }

  return NameEditor
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

class MoveableRowsModule extends EditorModule {
  constructor (parent, reference, property, childModule, options = {
    useDelete: true,
    useAdd: true
  }) {
    super(parent, reference, property)
    console.log(reference, property)


    this.ChildModule = childModule
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
      this.addButton = createElement({ parent: this.rowsDiv, tag: 'button', innerHTML: 'ADD' })
    }
    this.data = []
    this.int = new Pointer(this, 'data')

    console.log(this.out)
    this.out.read().forEach(row => {
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
    const newRow = createElement({ })
    const childElement = createElement({ parent: newRow })
    createElement({ parent: newRow, tag: 'button', className: this.delClass, innerHTML: 'DELETE' })
    createElement({ parent: newRow, tag: 'button', className: this.moveClass, innerHTML: 'MOVE' })
    this.seq++
    newRow.dataset.seq = this.seq
    this.indexValue[this.seq] = value
    const newModule = new this.ChildModule(childElement, this.indexValue, this.seq + '')
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
      this.inputElement = createElement({ parent: this.parent, tag: 'input' })
      createSearchQuery(
        this.inputElement,
        type
      )
      this.int = new Pointer(this.inputElement.dataset, 'id')
    }

    output () {
      super.output()
      const id = this.int.read()
      this.out.assign(id ? Number(id) : null)
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
    this.data = this.out.read()
    this.int = new Pointer(this, 'data')
    return [
      new TextInputModule(this.parent, this.data, 'name'),
      newSearchQueryModule(this.parent, this.data, 'reference', 'wiki_reference'),
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
    this.int = new Pointer(this, 'name')
  }

  createModules () {
    this.name = this.out.read() || {}

    return [
      new TextInputModule(this.parent, this.name, 'name'),
      newSearchQueryModule(this.parent, this.name, 'reference', 'wiki_reference'),
      new LocalizationNameModule(this.parent, this.name, 'pt'),
      new LocalizationNameModule(this.parent, this.name, 'fr'),
      new LocalizationNameModule(this.parent, this.name, 'es'),
      new LocalizationNameModule(this.parent, this.name, 'de'),
      new LocalizationNameModule(this.parent, this.name, 'ru')
    ]
  }
}

class SongAuthorModule extends EditorModule {
  build () {
    super.build()
    this.int = new Pointer(this, 'author')
  }

  createModules () {
    this.author = this.out.read() || {}

    return [
      newSearchQueryModule(this.parent, this.author, 'author', 'author'),
      newSearchQueryModule(this.parent, this.author, 'reference', 'wiki_reference')
    ]
  }
}

class AudioFileModule extends EditorModule {
  build() {
    super.build()
    this.audioParent = createElement({ parent: this.parent, innerHTML: generateAudio(this.out.read()) })
    this.int = new Pointer(this, 'data')
    this.data = this.modules.read() || {}
  }
}

export class SongEditor extends EditorModule {
  createModules () {
    return [
      new MoveableRowsModule(this.parent, this.out.r.song.data, 'names', SongNameModule),
      new MoveableRowsModule(this.parent, this.out.r.song.data, 'authors', SongAuthorModule),
      new TextInputModule(this.parent, this.out.r.song.data, 'link'),
      new MoveableRowsModule(this.parent, this.out.r.song.data, 'files', AudioFileModule)
    ]
  }
}

export class ReferenceEditor extends EditorModule {
  createModules () {
    const data = this.out.r.wiki_reference.data
    const parent = this.parent
    return [
      new TextInputModule(parent, data, 'name'),
      new TextInputModule(parent, data, 'link'),
      new TextAreaModule(parent, data, 'description')
    ]
  }
}

class CheckboxModule extends EditorModule {
  build () {
    super.build()
    this.checkbox = createElement({ parent: this.parent, tag: 'input', type: 'checkbox' })
    this.int = new Pointer(this.checkbox, 'checked')
  }
}

export class FileEditor extends EditorModule {
  createModules () {
    return [
      newSearchQueryModule(this.parent, this.out.r.file, 'source', 'source'),
      new TextAreaModule(this.parent, this.out.r.file, 'sourceLink'),
      new CheckboxModule(this.parent, this.out.r.file, 'isHQ')
    ]
  } 
}
