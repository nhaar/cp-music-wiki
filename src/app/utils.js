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

/**
 * Create a `RegExp` made from combining different `RegExp`s
 * @param  {...RegExp} patterns - Patterns to include
 * @returns {RegExp} Combined `RegExp`
 */
function groupPatterns (...patterns) {
  const sources = (patterns.map(pattern => pattern.source))
  const combined = sources.reduce((accumulator, cur) => {
    return accumulator + cur
  }, '')
  return new RegExp(combined)
}

/**
 * Match a sequence of `RegExp`s onto a string
 * @param {string} str - String to apply patterns to
 * @param {string} flags - Flag for the `RegExp`
 * @param  {...RegExp} patterns - Patterns to include
 * @returns {object | null | string[]} Result of the match
 */
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

module.exports = { compareObjects, deepcopy, groupPatterns, matchGroup, removeBraces }
