const fs = require('fs')

function groupPatterns (...patterns) {
  const sources = (patterns.map(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.source
    } else return pattern
  }))
  const combined = sources.reduce((accumulator, cur) => {
    return accumulator + cur
  }, '')
  return new RegExp(combined)
}

module.exports = {
  /**
   * Checks if two objects are the exact same (down to the order of things)
   * @param {object} obj1
   * @param {object} obj2
   * @returns {boolean}
   */
  compareObjects (obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
  },

  /**
   * Get a deepcopy of an object
   * @param {object} object - Object to copy
   * @returns {object} Copied object
   */
  deepcopy (object) { return JSON.parse(JSON.stringify(object)) },

  groupPatterns,

  matchGroup (str, flags, ...patterns) {
    return str.match(new RegExp(groupPatterns(...patterns), flags))
  },

  /**
   * Remove all curly brace characters from a string
   * @param {string} str
   * @returns {string}
   */
  removeBraces (str) {
    return str.replace(/{|}/g, '')
  },

  /**
   * Makes the first letter of a string uppercase
   * @param {string} str - String to modify
   * @returns Modified string
   */
  capitalize (str) {
    return `${str[0].toUpperCase()}${str.slice(1)}`
  },

  createDirectoryIfNotExists (directoryPath) {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath)
    }
  },

  /**
   * Match for a pattern than enclosures everything inside two characters
   * @param {string} str - String to match
   * @param {string} lChar - Left character of the enclosure
   * @param {string} rChar - Right character of the enclosure, leave blank for same as left
   * @returns {object | null} Match result
   */
  matchInside (str, lChar, rChar) {
    if (!rChar) rChar = lChar
    return str.match(`(?<=${lChar}).*(?=${rChar})`)
  },

  getToken (req) {
    const { cookie } = req.headers
    if (cookie) {
      const match = cookie.match(/(?<=(session=))[\d\w]+(?=(;|$))/)
      return match && match[0]
    } else return ''
  },

  getRandomInt (a, b) {
    return Math.floor(Math.random() * (b - a)) + a
  },

  getLastElement (arr) {
    return arr[arr.length - 1]
  }
}
