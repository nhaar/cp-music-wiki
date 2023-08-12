import { createElement, selectElements, styleElement } from '../utils.js'

/**
 * A pointer representation to a variable
 *
 * It consists of using the reference to an object and reserving a property inside the object
 */
export class Pointer {
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
    if (this.style) styleElement(this.e, ...this.style())
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
export class ArrayModule extends ChildModule {
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
export class ObjectModule extends ChildModule {
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
export class ElementModule extends ChildModule {}

/**
 * Object with the data for child modules in `TableModule` and `EditorModule`
 */
export class TableChild {
  /**
   * @param {string} header - Header for the the module's row
   * @param {BaseModule} Class - Module constructor
   * @param {string} property - Property in the pointer to access
   * @param  {...any} args - Arbitrary arguments for the constructor
   */
  constructor (header, description, Class, property, ...args) {
    Object.assign(this, { header, description, Class, property, args })
  }
}

/**
 * Module representing a table containing rows where each row
 * contains a name and a module
 */
export class TableModule extends ObjectModule {
  style () { return ['header-row', 'grid'] }

  constructModule (o) {
    const TableClass = getEditorRowModule(o.header, o.description, o.Class, true, ...o.args)
    return new TableClass(this, o.childOut)
  }
}

/**
 * Information for defining a child module in an `ObjectModule`
 */
export class ObjectChild {
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
 * Base class for the top module of an editor
 */
export class EditorModule extends ReceptorModule {
  constructModule (o) {
    const RowModule = getEditorRowModule(o.header, o.description, o.Class, true, ...o.args)
    return new RowModule(this, o.childOut)
  }
}

/**
 * Get a class for an editor's row
 * @param {string} header - Header of the row
 * @param {Class} ChildClass - Constructor for the class to be included
 * @param {boolean} useExpand - True if wants to use and expand button for the row
 * @param  {...any} args - Arbitrary arguments for the constructor
 * @returns {EditorModule} - Constructor for the editor's row
 */
function getEditorRowModule (header, description, ChildClass, useExpand, ...args) {
  class EditorRowModule extends ConnectionModule {
    /**
     * Render the HTML elements
     */
    prebuild () {
      const headerContainer = createElement({ parent: this.parent.e, className: 'editor-row-header' })

      createElement({ parent: headerContainer, innerHTML: header })
      if (description) {
        const questionMark = createElement({ parent: headerContainer, tag: 'img' })
        questionMark.src = 'images/question-mark.webp'
        questionMark.setAttribute('title', description)
      }
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
