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
