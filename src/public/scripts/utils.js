/**
 * Selects element with a CSS class within another element or within the document
 * @param {string} className
 * @param {HTMLElement} element - Element to search in, default: document
 * @returns {HTMLElement}
 */
export function selectElement (className, element = document) {
  return element.querySelector('.' + className)
}

/**
 * Selects all elements with a CSS class within another element or within the document
 * @param {string} className
 * @param {HTMLElement} element - Element to search in, default: document
 * @returns {HTMLElement}
 */
export function selectElements (className, element = document) {
  return element.querySelectorAll('.' + className)
}

/**
 * Creates an element following the specified options
 * @param {object} options
 * @param {string} options.tag - Tag name, like 'input', if 'div', don't need to write it
 * @param {string} options.parent - If want to append to an element, its parent reference
 * @param {string} options.className - If want to give it a single CSS class
 * @param {string} options.innerHTML - To replace its innerHTML
 * @param {string[]} options.classes - Array with all classes to add to it
 * @param {string} options.type - If want to set a type, like 'number' for inputs
 * @param {string} options.value - If want to set a value
 * @param {object} options.dataset - Object where each key is a data variable name and its value
 * @param {boolean} options.checked - True if it's a checked checkbox
 * @returns {HTMLElement}
 */
export function createElement (options) {
  let tag
  if (options) ({ tag } = options)
  if (!tag) tag = 'div'

  const newElement = document.createElement(tag)
  if (options) {
    const { parent, className, innerHTML, classes, type, value, dataset, checked } = options
    let { tag } = options
    if (!tag) tag = 'div'

    if (className) newElement.className = className

    if (classes) {
      classes.forEach(className => {
        newElement.classList.add(className)
      })
    }

    if (innerHTML) newElement.innerHTML = innerHTML

    if (type) newElement.setAttribute('type', type)

    if (checked) newElement.setAttribute('checked', checked)

    if (value) newElement.value = value

    if (dataset) {
      for (const variable in dataset) {
        newElement.dataset[variable] = dataset[variable]
      }
    }

    if (parent) parent.appendChild(newElement)
  }

  return newElement
}

/**
 * Asynchronously posts with JSON as content
 * @param {string} route - Route to post to
 * @param {object} object - Object to convert to JSON
 * @returns {response} Method response
 */
export async function postJSON (route, object) {
  console.log(route)
  const response = await fetch(route, {
    method: 'POST',
    body: JSON.stringify(object),
    headers: {
      'Content-Type': 'application/json'
    }
  })

  return response
}

/**
 * Posts a JSON and returns an object from a JSON response
 * @param {string} route - Route for the request
 * @param {object} object - Object to send
 * @returns {object} Object from response
 */
export async function postAndGetJSON (route, object) {
  const response = await postJSON(route, object)
  const data = await response.json()
  return data
}

/**
 * Checks inside an array of object each object until it finds one where the named property is equal to the given value, and returns the object
 * @param {object[]} object- Array of objects
 * @param {string} property
 * @param {*} value
 * @returns {object}
 */
export function findInObject (object, property, value) {
  for (let i = 0; i < object.length; i++) {
    const element = object[i]
    if (element[property] === value) { return element }
  }
}
