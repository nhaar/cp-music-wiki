import { createSearchQuery } from '../query-options.js'
import { createElement } from '../utils.js'
import { ElementModule, Pointer } from './main-modules.js'

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
  middleoutput () {
    this.int = new Pointer(this.textInput, this.access)
  }

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
export class TextInputModule extends SimpleTextModule {
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
export class TextAreaModule extends SimpleTextModule {
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
export class NumberInputModule extends SimpleTextModule {
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
 * Get a search query module constructor for a specific database type
 * @param {import('../../app/database.js').TypeName} type - Name of the type
 * @returns {SearchQueryModule} Module for the type
 */
export function getSearchQueryModule (type) {
  /**
   * Class containing a search query element, using as the i/o data the id of the queried objects
   */
  class SearchQueryModule extends ElementModule {
    /**
     * Render input for the query
     */
    prebuild () {
      this.inputElement = createElement({ parent: this.e, tag: 'input' })
      this.int = new Pointer(this.inputElement.dataset, 'id')
    }

    convertinput (input) { return input || '' }
    convertoutput (output) { return output ? Number(output) : null }

    /**
     * Setup search query
     */
    presetup () { createSearchQuery(this.inputElement, type) }
  }

  return SearchQueryModule
}

export function getOptionSelectModule (args) {
  const options = {}
  if (Array.isArray(args)) {
    args.forEach(arg => {
      const value = arg.match(/(?<=\[\s*)\w+/)[0]
      const key = arg.match(/(?<=").*(?=")/)[0]
      options[key] = value
    })
  }

  /**
 * Module containing a select HTML element with options
 */
  class OptionSelectModule extends ElementModule {
    /**
   * Render select element
   */
    prebuild () {
      this.selectElement = createElement({ parent: this.e, tag: 'select' })
      createElement({ parent: this.selectElement, tag: 'option', value: '' })
      for (const option in options) {
        const value = options[option]
        createElement({ parent: this.selectElement, tag: 'option', value, innerHTML: option })
      }
      this.int = new Pointer(this.selectElement, 'value')
    }

    /**
   * Expect the value output to be a number
   * @param {*} output
   * @returns {number} - Converted output
   */
    convertoutput (output) { return output }
  }

  return OptionSelectModule
}

/**
 * Module for a date input element
 */
export class DateInputModule extends ElementModule {
  /**
   * Build date input and pointer
   */
  prebuild () {
    this.dateInput = createElement({ parent: this.e, tag: 'input', type: 'date' })
    this.int = new Pointer(this.dateInput, 'value')
  }

  convertoutput (output) { return output || null }
}

/**
 * Module containing only a checkbox and having its checked property as the i/o data
 */
export class CheckboxModule extends ElementModule {
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

export function getFileUploadModule (filetype) {
/**
 * Module for a file upload element
 */
  class FileUploadModule extends ElementModule {
  /**
   * Render the HTML element
   */
    prebuild () {
      this.loading = Boolean(this.out.read())
      if (this.loading) {
        switch (filetype) {
          case 'audio': {
            createElement({ parent: this.e, innerHTML: generateAudio(this.out.read()) })
            break
          }
        }
      } else {
        this.fileUpload = createElement({ parent: this.e, tag: 'input', type: 'file' })
      }
    }

    /**
   * Send the file to the backend to get its data and then output it
   */
    async middleoutput () {
      if (!this.loading) {
        const file = this.fileUpload.files[0]
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('api/submit-file', {
          method: 'POST',
          body: formData
        })
        this.fileData = await response.json()
        this.int = new Pointer(this, 'fileData')
      }
    }
  }

  return FileUploadModule
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
