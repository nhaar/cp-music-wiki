const crypto = require('crypto')

const { SALT, ITERATIONS, KEYLEN, DIGEST } = require('../../config')

/**
 * Encrypt a value using the configuration for the password encryption
 * @param {string} value - Text to encrypt
 * @returns {string} Encrypted hash
 */
function getHash (value) {
  return crypto.pbkdf2Sync(value, SALT, ITERATIONS, KEYLEN, DIGEST).toString('hex')
}

/**
 * Generate a random token
 * @returns {string}
 */
function generateToken () {
  const token = crypto.randomBytes(256)
  return token.toString('hex')
}

module.exports = { getHash, generateToken }
