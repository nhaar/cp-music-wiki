const fs = require('fs')
const { getMatch } = require('./common-utils')

/** Class with helper methods to be used in the server side code */
class ServerUtils {
  /**
   * Group `RegExp` patterns into a single one, joining the patterns from left to right from the first pattern to the last one
   * to create a single `RegExp`
   * @param  {...(string | RegExp)} patterns - Arguments can be a `RegExp` literal or a string that represents part of a `RegExp`
   * @returns {RegExp} Combined `RegExp`
   */
  static groupPatterns (...patterns) {
    return new RegExp(
      patterns.map(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.source
        } else return pattern
      }).join('')
    )
  }

  /**
   * Checks if the data from two objects is the same, that is, check if the values of the properties are equal
   * (property order is also important)
   * @param {object} obj1 - Object to compare
   * @param {object} obj2 - Object to compare
   * @returns {boolean} True if the objects have equal properties and values
   */
  static compareObjects (obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
  }

  /**
   * Match a `RegExp` formed of joined `RegExp`'s in a string
   * @param {string} str - String to apply a `RegExp`
   * @param {string} flags - Flag for the `RegExp`
   * @param  {...(string | RegExp)} patterns - `RegExp` literals or strings representing `RegExp`'s to be joined into a single `RegExp` from the left to right
   * @returns {object | null} Result of the `RegExp` match
   */
  static matchGroup (str, flags, ...patterns) {
    return str.match(new RegExp(ServerUtils.groupPatterns(...patterns), flags))
  }

  /**
   * Remove all curly brace characters from a string
   * @param {string} str - String to modify
   * @returns {string} Modified string
   */
  static removeBraces (str) {
    return str.replace(/{|}/g, '')
  }

  /**
   * Capitalize the first character of a string
   * @param {string} str - String to modify
   * @returns Modified string
   */
  static capitalize (str) {
    return `${str[0].toUpperCase()}${str.slice(1)}`
  }

  /**
   * Create a directory if it doesn't exist
   * @param {string} directoryPath - Path to the directory
   */
  static createDirectoryIfNotExists (directoryPath) {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath)
    }
  }

  /**
   * Apply a `RegExp` match with the pattern with a greedy capture of everything between two characters, excluding
   * the two border characters, with no flags
   * @param {string} str - String to match
   * @param {string} lChar - Left character of the enclosure, with two `\` if it needs to be escaped in a `RegExp`
   * @param {string} rChar - Right character of the enclosure, with two `\` if it needs to be escaped, or leave out for the same as left
   * @returns {object | null} Result of the `RegExp` match
   */
  static matchInside (str, lChar, rChar) {
    if (!rChar) rChar = lChar
    return str.match(`(?<=${lChar}).*(?=${rChar})`)
  }

  /**
   * Obtain the user session token from an incoming HTTP request
   * @param {import('express').Request} req - Express request
   * @returns {string} User token if it exists, an empty string otherwise
   */
  static getToken (req) {
    if (req.headers.cookie) {
      return getMatch(req.headers.cookie, /(?<=(session=))[\d\w]+(?=(;|$))/)
    }
    return ''
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
   * Get the last element of an array
   * @param {any[]} arr - Target array
   * @returns {any} Last element of the array
   */
  static getLastElement (arr) {
    return arr[arr.length - 1]
  }

  /**
   * Check if a value is a JavaScript object, excluding arrays
   * @param {any} value - Value to check
   * @returns {boolean} `true` if the value is an object and not an array, `false` otherwise
   */
  static isObject (value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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
   * Iterate through all elements of an array and execute an asynchronous callback, awaiting between each callback
   * @param {any[]} arr - Array to iterate
   * @param {function(any, number)} callback - Asynchronous function executed in each iteration that takes as the first argument the current element of the array and as the second argument the index of the element
   */
  static async forEachAsync (arr, callback) {
    for (let i = 0; i < arr.length; i++) {
      await callback(arr[i], i)
    }
  }

  /**
   * In an array of objects, find which object has the property `id` matching a value
   * @param {object[]} array - Array with the objects
   * @param {number} id - Value the `id` property needs to match
   * @returns {object | undefined} The matched object if it exists
   */
  static findId (array, id) {
    for (let i = 0; i < array.length; i++) {
      if (array[i].id === id) return array[i]
    }
  }
}

module.exports = ServerUtils
