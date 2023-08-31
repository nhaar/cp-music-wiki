/** Class with helper methods and properties for both the server side and the client side code */
class CommonUtils {
  /**
   * Apply a `RegExp` match with no flags and get the matched string
   * @param {string} str - String to apply `RegExp`
   * @param {RegExp | string} pattern - `RegExp` literal or string with the pattern
   * @returns {string | null} Matched string if it exists, `null` otherwise
   */
  static getMatch (str, pattern) {
    const match = str.match(pattern)
    return match && match[0]
  }

  /**
   * Get the (first) name of an item from the string in the `querywords` column
   * @param {string} querywords - String from `querywords`
   * @returns {string | undefined} - First name if it exists, undefined otherwise
   */
  static getName (querywords) {
    if (typeof querywords !== 'string') return
    return CommonUtils.getMatch(querywords, /^.*(&|$)/)
  }

  /**
   * Obtain from the `document.cookie` string a map of cookie names to their values
   * @param {string} str - Cookie string
   * @returns {object} Map of cookie names to their values
   */
  static formatCookies (str) {
    const matches = str.match(/\w+=\w+(?=($|;))/g)
    const cookies = {}
    if (matches) {
      matches.forEach(match => {
        const [name, value] = match.match(/\w+/g)
        cookies[name] = value
      })
    }

    return cookies
  }

  /** Minimum number of characters allowed for the users' passwords */
  static MIN_PASSWORD_LENGTH = 8

  /**
   * Get a deepcopy of an object
   * @param {object} object - Object to copy
   * @returns {object} Copied object
   */
  static deepcopy (object) { return JSON.parse(JSON.stringify(object)) }
}

module.exports = CommonUtils
