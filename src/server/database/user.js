const crypto = require('crypto')

const validator = require('validator')

const sql = require('./sql-handler')
const { MIN_PASSWORD_LENGTH } = require('../misc/common-utils')
const mailer = require('../misc/email')
const { URL, SALT, ITERATIONS, KEYLEN, DIGEST } = require('../../../config')
const { getToken } = require('../misc/server-utils')
const WatchlistHandler = require('./watchlist-handler')

/** Class that manages everything related to the wiki user accounts */
class UserHandler {
  /** Create user related SQL tables if they don't exist */
  constructor () {
    // regular user table
    sql.create(`
      wiki_users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        user_password TEXT,
        email TEXT,
        session_token TEXT,
        created_timestamp NUMERIC,
        perms TEXT,
        blocked INT DEFAULT 0,
        watchlist TEXT DEFAULT ''
      )
    `)

    // table registers all the IPs an user has logged in with, encrpyted
    sql.create(`
      user_ip (
        user_id INT,
        ip TEXT
      )
    `)

    // table registers all generated password reset links
    sql.create(`
      pass_reset_link (
        user_id INT,
        link TEXT,
        expiration_timestamp NUMERIC
      )
    `)

    // table for registering blocks
    sql.create(`
      block_log (
        id SERIAL PRIMARY KEY,
        user_id INT,
        timestamp NUMERIC,
        reason TEXT
      )
    `)

    // watchlist tracking
    sql.create(`
      user_watchlist (
        user_id INT,
        item_id INT,
        expiration_timestamp NUMERIC
      )
    `)

    sql.create(`
      alerts (
        id SERIAL PRIMARY KEY,
        timestamp NUMERIC,
        text TEXT
      )
    `)

    sql.create(`
      user_alert (
        id SERIAL PRIMARY KEY,
        user_id INT,
        alert_id INT,
        read INT
      )
    `)
  }

  /**
   * Get the ID of a user given a session token
   * @param {string} token - Session token
   * @returns {number} ID of the user
   */
  async getUserId (token) {
    return await sql.selectColumn('wiki_users', 'session_token', token, 'id')
  }

  /**
   * Check if an user is an admin
   * @param {string} session - Session token of the user
   * @returns {boolean} `true` if the user is an admin, `false` otherwise
   */
  async isAdmin (session) {
    const account = await sql.selectRowWithColumn('wiki_users', 'session_token', session)
    return account && account.perms === 'admin'
  }

  /**
   * Check if an incoming HTTP request is being sent by an admin
   * @param {import('express').Request} req - Express request
   * @returns {boolean} `true` if an admin sent the request, `false` otherwise
   */
  async isAdminRequest (req) {
    return await this.isAdmin(getToken(req))
  }

  /**
   * Encrypt a value using the `config` encryption values
   * @param {string} value - Text to encrypt
   * @returns {string} Encrypted hash
   */
  getHash (value) {
    return crypto.pbkdf2Sync(value, SALT, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  }

  /**
   * Generate a random token
   * @returns {string} Token
   */
  generateToken () {
    return crypto.randomBytes(256).toString('hex')
  }

  /**
   * Confirm if an user's credentials are correct
   * @param {string} user - Username
   * @param {string} password - Password
   * @returns {number | null} Returns the user's id if the credentials are correct, `null` otherwise
   */
  async confirmCredentials (user, password) {
    const internalData = await sql.selectRowWithColumn('wiki_users', 'name', user)
    if (!internalData) return

    if (internalData.user_password === this.getHash(password)) return internalData.id
    else return null
  }

  /**
   * Generate session token if the credentials are correct
   * @param {string} user - Username
   * @param {string} password - Password
   * @returns {string | undefined} The session token if the credentials are correct or undefined if they aren't
   */
  async startSession (user, password, ip) {
    const userId = await this.confirmCredentials(user, password)
    if (userId === null) return

    const sessionToken = this.generateToken()
    sql.updateById('wiki_users', 'session_token', [sessionToken], userId)
    const previousIps = (await sql.selectWithColumn('user_ip', 'user_id', userId)).map(row => row.ip)

    if (!previousIps.includes(this.getHash(ip))) await this.insertIp(userId, ip)
    return sessionToken
  }

  /**
   * Create an account in the database
   * @param {string} name - Username of the account
   * @param {string} password - Password of the account
   * @param {string} email - Email address being registered
   * @param {string} ip - IP address requesting the account creation
   */
  async createAccount (name, password, email, ip) {
    const hash = this.getHash(password)
    await sql.insert('wiki_users', 'name, user_password, email, created_timestamp, perms', [name, hash, email, Date.now(), 'user'])
    const id = await sql.getBiggestSerial('wiki_users')
    await this.insertIp(id, ip)
  }

  /**
   * Log an IP address with its user
   * @param {number} user - User ID
   * @param {text} ip - IP address
   */
  async insertIp (user, ip) {
    await sql.insert('user_ip', 'user_id, ip', [user, this.getHash(ip)])
  }

  /**
   * Check if a session token is valid and belongs to an user
   * @param {string} session - Session token
   * @returns {object | null} User row from the database or `null` if the token is not valid
   */
  async checkUser (session) {
    return await sql.selectRowWithColumn('wiki_users', 'session_token', session) || null
  }

  /**
   * Terminates an user's session, disconnecting them
   * @param {string} session - Session token
   */
  async disconnectUser (session) {
    // prevent empty session overlap
    if (session === '') return
    const id = await this.getUserId(session)
    // do nothing if nothing was found
    if (id === undefined) return
    await sql.updateById('wiki_users', 'session_token', [''], id)
  }

  /**
   * Check if a name is taken as a wiki account username
   * @param {string} name
   * @returns {boolean} `true` if the name is taken, `false` otherwise
   */
  async isNameTaken (name) {
    return (await sql.selectWithColumn('wiki_users', 'name', name)).length !== 0
  }

  /**
   * Check if an account can be created with the given credentials
   * @param {string} name - Account's username
   * @param {string} password - Accounts's password
   * @param {string} email - Account's email
   * @returns {boolean} `true` if the account can be created, `false` otherwise
   */
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

  /**
   * Send a reset password email for an account
   * @param {string} username - Target account's username
   */
  async sendResetPassEmail (username) {
    const row = (await sql.selectWithColumn('wiki_users', 'name', username))[0]
    const expirationTime = 15 // in minutes
    if (row) {
      const linkToken = this.generateToken()
      sql.insert('pass_reset_link', 'user_id, link, expiration_timestamp', [
        row.id, linkToken, Date.now() + expirationTime * 60000 // convert to ms
      ])

      await mailer.sendEmail(row.email, 'Change your Club Penguin Music Wiki password', `Someone requested a password reset for your account.

If this was you, you can reset your password via the following link:

${URL}Special:ResetPassword?t=${linkToken}`)
    }
  }

  /**
   * Check if a reset password link is valid
   * @param {string} token - Password link token
   * @returns {boolean} `true` if the link is valid, `false` otherwise
   */
  async resetLinkIsValid (token) {
    return Boolean(await this.getResetLink(token))
  }

  /**
   * Override an user's account password
   * @param {string} token - Password link token
   * @param {string} newPass - New password
   */
  async resetPassword (token, newPass) {
    const row = await this.getResetLink(token)
    if (row) {
      await sql.updateById('wiki_users', 'user_password', [this.getHash(newPass)], row.user_id)
    }
  }

  /**
   * Generate a new password reset link for an account
   * @param {string} token - Account's session token
   * @returns {string} Password reset link token
   */
  async getResetLink (token) {
    return (await sql.selectGreaterAndEqual(
      'pass_reset_link',
      'expiration_timestamp', Date.now(),
      'link', [token]
    ))[0]
  }

  /**
   * Get an user's row based on their name
   * @param {string} name - Username
   * @returns {object} User's row object
   */
  async getUserFromName (name) {
    return await sql.selectRowWithColumn('wiki_users', 'name', name)
  }

  /**
   * Check if an user is watching an item
   * @param {string} token - User's session token
   * @param {number} id - Item id
   * @returns {boolean} `true` if user is watching, `false` otherwise
   */
  async isWatching (token, id) {
    const watchlistHandler = new WatchlistHandler(await this.getUserId(token))
    return await watchlistHandler.isWatching(id)
  }

  async getUsername (id) {
    return await sql.selectColumn('wiki_users', 'id', id, 'name')
  }
}

module.exports = new UserHandler()
