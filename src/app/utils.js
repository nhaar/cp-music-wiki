/**
 * Checks if two objects are the exact same (down to the order of things)
 * @param {object} obj1
 * @param {object} obj2
 * @returns {boolean}
 */
function compareObjects (obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

/**
 * Get a deepcopy of an object
 * @param {object} object - Object to copy
 * @returns {object} Copied object
 */
function deepcopy (object) { return JSON.parse(JSON.stringify(object)) }

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

function matchGroup (str, flags, ...patterns) {
  return str.match(new RegExp(groupPatterns(...patterns), flags))
}

/**
 * Remove all curly brace characters from a string
 * @param {string} str
 * @returns {string}
 */
function removeBraces (str) {
  return str.replace(/{|}/g, '')
}

/**
 * Makes the first letter of a string uppercase
 * @param {string} str - String to modify
 * @returns Modified string
 */
function capitalize (str) {
  return `${str[0].toUpperCase()}${str.slice(1)}`
}

module.exports = { compareObjects, deepcopy, groupPatterns, matchGroup, removeBraces, capitalize }
