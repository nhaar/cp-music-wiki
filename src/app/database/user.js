const sql = require('./sql-handler')

const crypto = require('crypto')

const { SALT, ITERATIONS, KEYLEN, DIGEST } = require('../../../config')

class UserHandler {
  constructor () {
    sql.create(`
      wiki_users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        user_password TEXT,
        display_name TEXT,
        session_token TEXT,
        created_timestamp NUMERIC
      )
    `)
  }

  /**
   * Get the ID of a user given a session token
   * @param {string} token - Session token
   * @returns {number} ID of the user
   */
  async getUserId (token) {
    return (await sql.select('wiki_users', 'session_token', token, 'id'))[0].id
  }

  /**
   * Check if a user is an admin
   * @param {string} session - The session token
   * @returns {boolean} True if is an admin
   */
  async isAdmin (session) {
    // currently every user is admin so just check for existence of account
    const account = (await sql.select('wiki_users', 'session_token', session))[0]
    return Boolean(account)
  }

  /**
 * Encrypt a value using the configuration for the password encryption
 * @param {string} value - Text to encrypt
 * @returns {string} Encrypted hash
 */
  getHash (value) {
    return crypto.pbkdf2Sync(value, SALT, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  }

  /**
 * Generate a random token
 * @returns {string}
 */
  generateToken () {
    const token = crypto.randomBytes(256)
    return token.toString('hex')
  }

  /**
   * Generate session token if the credentials are correct
   * @param {string} user - Username
   * @param {string} password - Password
   * @returns {string | undefined} The session token if the credentials are correct or undefined if they aren't
   */
  async checkCredentials (user, password) {
    const internalData = (await sql.select('wiki_users', 'name', user))[0]
    if (!internalData) return

    const hash = this.getHash(password)

    if (internalData.user_password === hash) {
      const sessionToken = this.generateToken()
      sql.update('wiki_users', 'session_token', 'id', [internalData.id, sessionToken])
      return sessionToken
    }
  }

  /**
   * Create an account in the database
   * @param {string} name - Username of the account
   * @param {string} password - Password of the account
   * @param {string} display - The display name of the account
   */
  async createAccount (name, password, display) {
    const hash = this.getHash(password)
    sql.insert('wiki_users', 'name, user_password, display_name, created_timestamp', [name, hash, display, Date.now()])
  }
}

module.exports = new UserHandler()
