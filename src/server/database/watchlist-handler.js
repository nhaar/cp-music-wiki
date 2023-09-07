const { convertDaysToMs } = require('../misc/common-utils')
const sql = require('./sql-handler')

/** Handle the watchlist of the wiki users */
class WatchlistHandler {
  /** Build instance linked to an user */
  constructor (user) {
    Object.assign(this, { user })
  }

  /** Table with watchlist data */
  static table = 'user_watchlist'

  /** Name of the column that stores the user id */
  static userCol = 'user_id'

  /** Name of the column that stores the item id */
  static itemCol = 'item_id'

  /** Name of the column that stores the expiration timestamp */
  static expirationCol = 'expiration_timestamp'

  /**
   * Get the arguments for the `SQLHandler` methods `selectAndEquals` and `deleteAndEquals` as they are used in this
   * class
   * @param {number} item - Item id involved in the action
   * @returns {array} Array with arguments
   */
  getSqlArg (item) {
    return [WatchlistHandler.table, `${WatchlistHandler.userCol}, ${WatchlistHandler.itemCol}`, [this.user, item]]
  }

  /**
   * Add an item to the watchlist of this instance's user
   * @param {number} item - Item id
   * @param {string} expirationPeriod - Period in days for how long after today it should expire, or set `0` for no expiration date
   */
  async addToWatchlist (item, expirationPeriod) {
    await this.removeFromWatchlist(item)
    await sql.insert(
      WatchlistHandler.table,
      [WatchlistHandler.userCol, WatchlistHandler.itemCol, WatchlistHandler.expirationCol].join(', '),
      [this.user, item, expirationPeriod === 0 ? 0 : Date.now() + convertDaysToMs(expirationPeriod)]
    )
  }

  /**
   * Remove all mentions of an item in the watchlist of this instance's user
   * @param {number} item - Item id
   */
  async removeFromWatchlist (item) {
    await sql.deleteAndEquals(...this.getSqlArg(item))
  }

  /**
   * Check if this instance's user is watching an item
   * @param {number} item - Item id
   * @returns {boolean} `true` if the user is watching the item, `false` otherwise
   */
  async isWatching (item) {
    const row = (await sql.selectAndEquals(...this.getSqlArg(item)))[0]
    if (!row) return false

    const timestamp = row[WatchlistHandler.expirationCol]
    const isExpired = Date.now() < timestamp
    if (isExpired) {
      await this.removeFromWatchlist(item)
    }
    return (timestamp === '0' || !isExpired)
  }
}

module.exports = WatchlistHandler
