const sql = require('./sql-handler')
const validator = require('validator')
const { MIN_PASSWORD_LENGTH } = require('../misc/common-utils')

const crypto = require('crypto')

const { SALT, ITERATIONS, KEYLEN, DIGEST } = require('../../../config')
const { formatCookies } = require('../misc/common-utils')

class UserHandler {
  constructor () {
    sql.create(`
      wiki_users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        user_password TEXT,
        email TEXT,
        session_token TEXT,
        created_timestamp NUMERIC,
        perms TEXT
      )
    `)

    sql.create(`
      user_ip (
        user_id INT,
        ip TEXT
      )
    `)
  }

  /**
   * Get the ID of a user given a session token
   * @param {string} token - Session token
   * @returns {number} ID of the user
   */
  async getUserId (token) {
    return (await sql.selectWithColumn('wiki_users', 'session_token', token, 'id'))[0].id
  }

  /**
   * Check if a user is an admin
   * @param {string} session - The session token
   * @returns {boolean} True if is an admin
   */
  async isAdmin (session) {
    const account = (await sql.selectWithColumn('wiki_users', 'session_token', session))[0]
    return account.perms === 'admin'
  }

  getToken (req) {
    return formatCookies(req.headers.cookie).session
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
  async checkCredentials (user, password, ip) {
    const internalData = (await sql.selectWithColumn('wiki_users', 'name', user))[0]
    if (!internalData) return

    const hash = this.getHash(password)

    if (internalData.user_password === hash) {
      const sessionToken = this.generateToken()
      sql.updateById('wiki_users', 'session_token', [sessionToken], internalData.id)
      const previousIps = (await sql.selectWithColumn('user_ip', 'user_id', internalData.id))
        .map(row => row.ip)

      if (!previousIps.includes(this.getHash(ip))) await this.insertIp(internalData.id, ip)
      return sessionToken
    }
  }

  /**
   * Create an account in the database
   * @param {string} name - Username of the account
   * @param {string} password - Password of the account
   * @param {string} display - The display name of the account
   */
  async createAccount (name, password, email, ip) {
    const hash = this.getHash(password)
    await sql.insert('wiki_users', 'name, user_password, email, created_timestamp, perms', [name, hash, email, Date.now(), 'user'])
    const id = await sql.getBiggestSerial('wiki_users')
    await this.insertIp(id, ip)
  }

  async insertIp (user, ip) {
    await sql.insert('user_ip', 'user_id, ip', [user, this.getHash(ip)])
  }

  async checkUser (session) {
    const row = (await sql.selectWithColumn('wiki_users', 'session_token', session))[0]
    if (row) {
      return {
        user: row.name
      }
    } else {
      return false
    }
  }

  async disconnectUser (session) {
    const id = await this.getUserId(session)
    await sql.updateById('wiki_users', 'session_token', [''], id)
  }

  async isNameTaken (name) {
    return (await sql.selectWithColumn('wiki_users', 'name', name)).length !== 0
  }

  async canCreate (name, password, email) {
    return (
      typeof name === 'string' &&
      typeof password === 'string' &&
      typeof email === 'string' &&
      !await this.isNameTaken(name) &&
      name !== '' &&
      password.length >= MIN_PASSWORD_LENGTH &&
      validator.isEmail(email)
    )
  }
}

module.exports = new UserHandler()
