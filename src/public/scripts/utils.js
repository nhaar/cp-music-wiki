
export function selectElement (className, element = document) {
  return element.querySelector('.' + className)
}

export function selectElements (className, element = document) {
  return element.querySelectorAll('.' + className)
}

export function createElement (
  options
) {
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

    if (checked) newElement.setAttribute('checked')

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
