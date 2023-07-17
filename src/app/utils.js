/**
 * Checks if two objects are the exact same (down to the order of things)
 * @param {object} obj1
 * @param {object} obj2
 * @returns
 */
function compareObjects (obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

/**
 * Transforms a youtube video code
 * into a shortened link
 * @param {string} videoCode
 * @returns {string} Shortened link
 */
function youtubify (videoCode) {
  if (!videoCode) return ''
  return 'youtu.be/' + videoCode
}

module.exports = { compareObjects, youtubify }
