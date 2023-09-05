const user = require('./user')
const sql = require('./sql-handler')

/** Class that handles blocking related actions */
class UserBlocker {
  /**
   * Build the blocker for an user
   * @param {string} username - Username
   */
  constructor (username) {
    Object.assign(this, { username })
  }

  /** Save the instance's user's id in the instance */
  async getId () {
    this.id = (await user.getUserFromName(this.username)).id
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
