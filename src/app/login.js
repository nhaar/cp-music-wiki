const crypto = require('crypto')
const db = require('./database')

const { SALT, ITERATIONS, KEYLEN, DIGEST } = require('../../config')

function getHash (value) {
  return crypto.pbkdf2Sync(value, SALT, ITERATIONS, KEYLEN, DIGEST).toString('hex')
}

function generateToken () {
  const token = crypto.randomBytes(256)
  return token.toString('hex')
}

async function checkCredentials (user, password) {
  const internalData = (await db.handler.select('wiki_users', 'name', user))[0]
  if (!internalData) return

  const hash = getHash(password)

  if (internalData.user_password === hash) {
    const sessionToken = generateToken()
    db.handler.update('wiki_users', 'session_token', 'id', [internalData.id, sessionToken])
    return sessionToken
  }
}

module.exports = { checkCredentials }
