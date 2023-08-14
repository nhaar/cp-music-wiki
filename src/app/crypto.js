const crypto = require('crypto')

const { SALT, ITERATIONS, KEYLEN, DIGEST } = require('../../config')

function getHash (value) {
  return crypto.pbkdf2Sync(value, SALT, ITERATIONS, KEYLEN, DIGEST).toString('hex')
}

function generateToken () {
  const token = crypto.randomBytes(256)
  return token.toString('hex')
}

module.exports = { getHash, generateToken }
