import { formatCookies } from '../../server/misc/common-utils'

/**
 * Asynchronously make a `POST` request with the body being `JSON`
 * @param {string} route - Route for the request
 * @param {object} object - Object that will be used as the body
 * @returns {Response} Method response
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
 * Make a `POST` request for a route that uses `JSON` as the body and responds with `JSON`
 * @param {string} route - Route for the request
 * @param {object} object - Object to send in the body
 * @returns {object} Object from response
 */
export async function postAndGetJSON (route, object) {
  const response = await postJSON(route, object)
  const data = await response.json()
  return data
}

/**
 * Checks inside an array of object for each object until it finds one where a named property is equal to a given value,
 * and returns the object and its index inside the array
 * @param {object[]} object - Array of objects
 * @param {string} property - Name of the property to search
 * @param {any} value - Given value to match
 * @returns {object} Object containing the found object under the key `element` and the index under the key `i`
 */
function findElementInObject (object, property, value) {
  for (let i = 0; i < object.length; i++) {
    const element = object[i]
    if (element[property] === value) { return { element, i } }
  }
  return { }
}

/**
 * Returns the object found from `findElementInObject` (check the docs for that function for details)
 * @param {object[]} object - Array of objects
 * @param {string} property - Name of the property to search
 * @param {any} value - Given value to match
 * @returns {object} Object found
 */
export function findInObject (object, property, value) {
  return findElementInObject(object, property, value).element
}

/**
 * Returns the index from `findElementInObject` (check the docs for that function for details)
 * @param {object[]} object - Array of objects
 * @param {string} property - Name of the property to search
 * @param {any} value - Given value to match
 * @returns {number} Index found
 */
export function findIndexInObject (object, property, value) {
  return findElementInObject(object, property, value).i
}

/**
 * Get the cookies organized in an object
 * @returns {object} Object where the keys are the cookie names and the values are the cookie values
 */
export function getCookies () {
  return formatCookies(document.cookie)
}

/**
 * Get the name of a month
 * @param {number} month - Month number, starting at 0 for January
 * @returns {string} Month name
 */
export function getMonthName (month) {
  return [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ][month]
}

/**
 * Set the `n-th` index within a React stateful array to a value
 * @param {number} n - Target index
 * @param {any} value - Value to set
 * @param {SetStateAction} setValues - State's `set` method
 */
export function setNthValue (n, value, setValues) {
  setValues(v => {
    const newV = [...v]
    newV[n] = value
    return newV
  })
}

/**
 * Get a click handler that sets a state value to the `value` property of an element tied to an event
 * @param {SetStateAction} setter - State's `set` method
 * @returns {function(Event) : void}
 */
export function getValueChangeHandler (setter) {
  return e => { setter(e.target.value) }
}

/**

 * Get a click handler that sets a state value to the `checked` property of an element tied to an event
 * @param {SetStateAction} setter - State's `set` method
 * @returns {function(Event) : void}
 */
export function getCheckedChangeHandler (setter) {
  return e => { setter(e.target.checked) }
}
