module.exports = {
  getName (querywords) {
    return querywords && querywords.match('^.*(&|$)')[0]
  },
  formatCookies (str) {
    const matches = str.match(/\w+=\w+(?=($|;))/g)
    const cookies = {}
    if (matches) {
      matches.forEach(match => {
        const words = match.match(/\w+/g)
        cookies[words[0]] = words[1]
      })
    }

    return cookies
  },
  MIN_PASSWORD_LENGTH: 8,

  /**
   * Get a deepcopy of an object
   * @param {object} object - Object to copy
   * @returns {object} Copied object
   */
  deepcopy (object) { return JSON.parse(JSON.stringify(object)) }
}
