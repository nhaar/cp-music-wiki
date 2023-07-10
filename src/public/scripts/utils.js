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
