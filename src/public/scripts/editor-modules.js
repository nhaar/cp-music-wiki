import { createElement } from "./utils.js"

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
      console.log(this, refTwo, this.propTwo)
      refTwo[this.propTwo] = this.refOne[this.propOne]
    }
    this.modules.forEach(module => module.input())
  }

  setup () {
    this.modules.forEach(module => module.setup())
  }

  output () {
    const { refTwo } = this
    if (refTwo) {
      this.refOne[this.propOne] = refTwo[this.propTwo]
    }
    this.modules.forEach(module => module.output())
    return this.refOne
  }
}

class TextInputModule extends EditorModule {
  build () {
    this.textInput = createElement({ parent: this.parent, tag: 'input'})
    this.refTwo = this.textInput
    this.propTwo = 'value'
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

