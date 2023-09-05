const crypto = require('crypto')

/**
 * Creates a simple hash for a value
 * @param {string} value - Value to hash
 * @returns {string} Hash
 */
module.exports = (value) => {
  return ((crypto.createHash('sha256')).update(value)).digest('hex')
}
