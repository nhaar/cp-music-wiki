const user = require('./user')
const sql = require('./sql-handler')

/** Class that handles blocking related actions */
class UserBlocker {
  /**
   * Build the blocker for an user
   * @param {object} userconfig - User data, at least one of the properties must be valid
   * @param {string} userconfig.username - Username
   * @param {number} userconfig.id - User id
   */
  constructor (userconfig) {
    Object.assign(this, userconfig)
  }

  /**
   * Get the row for the instance's user
   * @returns {object} User's row object
   */
  async getRow () {
    if (this.username) return await user.getUserFromName(this.username)
    else if (this.id) return await sql.selectId('wiki_users', this.id)
  }

  /** Save the instance's user's id in the instance */
  async getId () {
    this.id = (await this.getRow()).id
  }

  /** Save the instance's user's session in the instance */
  async getSession () {
    this.session = (await this.getRow()).session_token
  }

  /**
   * Block the instance's user if they are unblocked, unblock if they are blocked
   * @param {string} reason - Reason for blocking/unblocking
   */
  async swapBlock (reason) {
    if (!this.id) await this.getId()
    const numberVal = Number(!await this.isBlocked())
    await sql.updateById('wiki_users', 'blocked', numberVal, this.id)
    await sql.insert('block_log', 'user_id, timestamp, reason, is_block', [this.id, Date.now(), reason, numberVal])
    // log out if blocking user
    if (numberVal) {
      await this.getSession()
      await user.disconnectUser(this.session)
    }
  }

  /**
   * Check if the instance's user is block
   * @returns {boolean} `true` if user is blocked, `false` otherwise
   */
  async isBlocked () {
    if (!this.id) await this.getId()
    return Boolean((await sql.selectId('wiki_users', this.id)).blocked)
  }
}

module.exports = UserBlocker
