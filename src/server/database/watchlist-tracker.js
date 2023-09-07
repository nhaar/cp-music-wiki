const CellList = require('./cell-list')

/** Handle the watchlist of the wiki users */
class WatchlistTracker extends CellList {
  /**
   * Build instance linked to user of id `user`
   * @param {number} user
   */
  constructor (user) {
    super('wiki_users', 'watchlist', 'id', user)
  }
}

module.exports = WatchlistTracker
