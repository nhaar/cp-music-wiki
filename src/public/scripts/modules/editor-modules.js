import { GridModule, MoveableRowsModule } from './array-modules.js'
import {
  CheckboxModule, DateInputModule,
  NumberInputModule,
  TextAreaModule, TextInputModule, getFileUploadModule, getSearchQueryModule
} from './element-modules.js'
import { EditorModule, TableChild, TableModule } from './main-modules.js'

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

/*
0. CPT is defined
1. Frontend goes to the preeditor and get the CPT (only that is necessary because validators are backend only anyways), with that, it can list the names similarly to what we have already, static and non static types alike, then redirect to editor page
2. IN editor page, get CPT for the type being edited + all property types, then fetch the usual data, and build the editor using the CPT for it
3. The editor assembler: building modules recursively, with different modules corresponding to different datatypes:
* TYPE[] -> moveable rows with modules following TYPE
* TYPE[][] -> grid module with modules following TYPE
* TEXTSHORT -> text input module
* TEXTLONG -> text area module
* INT -> number input module
* ID(type) -> search query module of the type in parenthesis
* DATE -> date input module
* BOOLEAN -> Checkbox module
* FILE(audio) -> file input module

Modules that we could try adapting?
* option select module ->

TODO
- handle query stuff

*/
