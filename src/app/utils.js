/**
 * Checks if two objects are the exact same (down to the order of things)
 * @param {object} obj1
 * @param {object} obj2
 * @returns
 */
function compareObjects (obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

module.exports = { compareObjects }
