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
    return CommonUtils.trimArray(str.split(','))
  }

  static trimArray (arr) {
    return arr.map(segment => segment.trim()).filter(segment => segment)
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

  static matchInArray (arr, pattern) {
    return arr.map(e => CommonUtils.getMatch(e, pattern)).filter(e => e)[0]
  }

  static getExtremeCharEnclosurePattern (char) {
    return `(?<=^${char}).*(?=${char}$)`
  }

  /**
   * Convert a number `days` in days to miliseconds
   * @param {number} days
   * @returns {number}
   */
  static convertDaysToMs (days) {
    return days * 86400000
  }

  /**
   * Check if a value is a string representation of an integer
   * @param {any} value - Value to check
   * @returns {boolean} `true` if the value is a string representation of an integer, `false` otherwise
   */
  static isStringNumber (value) {
    return typeof value === 'string' && value.match(/^\d+$/)
  }

  /**
   * Check if `value` is a valid number or if it is a string representing a number
   * @param {any} value
   * @returns {boolean} `true` if it is number like or `false` otherwise
   */
  static isNumberLike (value) {
    return (typeof value === 'number' && !isNaN(value)) || CommonUtils.isStringNumber(value)
  }

  /**
   * Get a random integer in an interval
   * @param {number} a - Lower bound of the interval, including
   * @param {number} b - Upper bound of the interval, excluding
   * @returns {number} Random generated integer
   */
  static getRandomInt (a = 0, b) {
    return Math.floor(Math.random() * (b - a)) + a
  }

  /**
   * Generate a random and unique hash
   * @returns {string} A string containing an unique value
   */
  static getUniqueHash () {
    return [CommonUtils.getRandomInt(0, 1048576/* 16^5 */), Date.now()].map(n => n.toString(16)).join('')
  }

  /**
   * Get the name of a month
   * @param {number} month - Month number, starting at 0 for January
   * @returns {string} Month name
   */
  static getMonthName (month) {
    return [
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ][month]
  }

  /**
   * Format a date to a string in the format `DD MonthName YYYY`
   * @param {Date} date
   * @returns {string}
   */
  static formatDate (date) {
    return `${date.getDate()} ${CommonUtils.getMonthName(date.getMonth())} ${date.getFullYear()}`
  }
}

module.exports = CommonUtils
