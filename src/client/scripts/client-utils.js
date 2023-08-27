import { formatCookies } from '../../server/misc/common-utils'

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

export async function getJSON (route) {
  return (
    await (await fetch(route)).json()
  )
}

/**
 * Checks inside an array of object each object until it finds one where the named property is equal to the given value, and returns the object and index
 * @param {object[]} object - Array of objects
 * @param {string} property
 * @param {*} value
 * @returns {object}
 */
function findElementInObject (object, property, value) {
  for (let i = 0; i < object.length; i++) {
    const element = object[i]
    if (element[property] === value) { return { element, i } }
  }
  return { }
}

/**
 * Check findElementInObject
 *
 * Returns the object from that function
 * @param {object[]} object
 * @param {string} property
 * @param {*} value
 * @returns {object}
 */
export function findInObject (object, property, value) {
  return findElementInObject(object, property, value).element
}

/**
 * Check findElementInObject
 *
 * Returns the index from that function
 * @param {object[]} object
 * @param {string} property
 * @param {*} value
 * @returns {number}
 */
export function findIndexInObject (object, property, value) {
  return findElementInObject(object, property, value).i
}

export function deepcopy (obj) { return JSON.parse(JSON.stringify(obj)) }

export function getCookies () {
  return formatCookies(document.cookie)
}

export function getMonthName (month) {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][month - 1]
}

export function setNthValue (n, value, setValues) {
  setValues(v => {
    const newV = [...v]
    newV[n] = value
    return newV
  })
}
