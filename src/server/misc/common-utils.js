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
    return querywords.split('&&')[0]
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

  /**
   * Split a string separated by comma and trim every element
   * @param {string} str
   * @returns
   */
  static trimSplit (str) {
    return str.split(',').map(segment => segment.trim()).filter(segment => segment)
  }

  /**
   * Check if a string belongs to the keys of an object
   * @param {object} obj - Object to check
   * @param {string} key - String to find
   * @returns {boolean} `true` if the keys include the key, `false` if it doesn't
   */
  static keysInclude (obj, key) { return Object.keys(obj).includes(key) }

  /**
   * Remove all bracket characters from a string
   * @param {string} str - String
   * @returns {string} Modified string
   */
  static removeBrackets (str) {
    return str.replace(/\[|\]/g, '')
  }
}

module.exports = CommonUtils
