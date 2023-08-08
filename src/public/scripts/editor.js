import { createElement, deepcopy, postAndGetJSON, postJSON, selectElement } from './utils.js'

class Page {
  constructor () {
    this.editor = selectElement('js-editor')
  }

  /**
   * Renders the button for submitting the data at the end of the page
   */
  renderSubmitButton () {
    this.submitButton = createElement({ parent: document.body, tag: 'button', innerHTML: 'Submit' })
  }

  /**
   * Add controls to the submit button
   */
  setupSubmitButton (editorModule, row, type) {
    this.submitButton.addEventListener('click', async () => {
      await editorModule.output()
      console.log(deepcopy(row))
      postJSON('api/update', { type, row, isStatic: this.isStatic })
    })
  }

  /**
   * Initializes the editor by handling the options from the URL
   * and initializing the editor for that type
   */
  async initialize () {
    // get URL params
    const urlParams = new URLSearchParams(window.location.search)
    const params = this.paramsToObject(urlParams)
    const editorData = await postAndGetJSON('api/editor-data', { t: Number(params.t) })

    const id = Number(params.id)

    // const typeInfo = types[typeNumber]
    const { isStatic, type } = editorData
    Object.assign(this, { isStatic })
    let row
    let data
    if (isStatic) {
      row = await postAndGetJSON('api/get-static', { type })
      data = row.data
    } else {
      if (id) {
        row = await postAndGetJSON('api/get', { type, id })
        data = row.data
      } else {
        data = await postAndGetJSON('api/default', { type })
        row = { data }
      }
    }
    console.log(deepcopy(row))
    const Editor = constructEditorModule(editorData)
    const editor = new Editor(data, this.editor)

    editor.build()
    editor.input()
    editor.setup()

    this.renderSubmitButton()
    this.setupSubmitButton(editor, row, type)
  }

  /**
   * Converts URL parameters into an object
   * containing the values of each of the query parameters
   * @param {URLSearchParams} urlParams - URL parameters to target
   * @returns {object} Object for the query parameters
   */
  paramsToObject (urlParams) {
    const params = {}
    const paramsArray = [...urlParams.entries()]
    paramsArray.forEach(array => {
      params[array[0]] = array[1]
    })
    return params
  }
}


function splitStatements (code) {
  return code.split('\n').map(line => line.trim()).filter(line => line)
}

function matchInside (str, lChar, rChar) {
  if (!rChar) rChar = lChar
  return str.match(`(?<=${lChar}).*(?=${rChar})`)
}

function buildEditor (code, data, topModule) {
  const lines = splitStatements(code)
  const moduleList = []

  lines.forEach(line => {
    const property = line.match(/\w+/)[0]
    const firstWord = '\\w+\\s+'
    const typePattern = '(?:{)?(\\w|\\(|\\))+(?:})?(\\[\\])*'
    let type = line.match(`(?<=${firstWord})${typePattern}`)[0]
    const rest = line.match(`(?<=(${firstWord}${typePattern}\\s+)).*`)
    let params = []
    if (rest) {
      const restString = rest[0]
      const quotePattern = /".*"/
      const quoted = restString.match(quotePattern)
      params = restString.replace(quotePattern, '').match(/\S+/g) || []
      if (quoted) params.push(quoted[0])
    }

    let headerName = 'PLACEHOLDER'
    params.forEach(param => {
      if (param.includes('"')) headerName = matchInside(param, '"')[0]
    })

    const brackets = type.match(/\[\]/g)
    let arrayModule
    if (brackets) {
      type = removeBrackets(type)
      if (brackets.length === 1) {
        arrayModule = MoveableRowsModule
      } else if (brackets.length === 2) {
        arrayModule = GridModule
      }
    }

    let arg = matchInside(type, '\\(', '\\)')

    if (arg) {
      arg = arg[0]
      type = type.replace(/\(.*\)/, '')
    }

    let moduleType
    if (type.includes('{')) {
      type = removeBraces(type)

      moduleType = buildEditor(data[type], data, false)
    } else {
      moduleType = {
        TEXTSHORT: TextInputModule,
        TEXTLONG: TextAreaModule,
        ID: getSearchQueryModule(arg),
        DATE: DateInputModule,
        BOOLEAN: CheckboxModule,
        FILE: getFileUploadModule(arg),
        INT: NumberInputModule
      }[type]
    }

    const pushfn = (main, arg) => {
      moduleList.push(new TableChild(headerName, main, property, arg))
    }

    if (brackets) {
      pushfn(arrayModule, moduleType)
    } else {
      pushfn(moduleType)
    }
  })

  const Extending = topModule ? EditorModule : TableModule

  class Editor extends Extending {
    modules () {
      return moduleList
    }
  }
  return Editor
}

export function constructEditorModule (editorData) {
  return buildEditor(editorData.main, editorData, true)
}

function removeBrackets (str) {
  return str.replace(/\[|\]/g, '')
}

function removeBraces (str) {
  return str.replace(/{|}/g, '')
}


const page = new Page()
page.initialize()
