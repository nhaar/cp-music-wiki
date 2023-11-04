const ItemClassDatabase = require('../item-class/item-class-database')
const { itemClassHandler } = require('../item-class/item-class-handler')
const sql = require('./sql-handler')
const user = require('./user')
const WatchlistHandler = require('./watchlist-handler')

class UserAlerts {
  static alertTable = 'alerts'

  static userTable = 'user_alert'

  static textCol = 'text'

  static timestampCol = 'timestamp'

  static userCol = 'user_id'

  static alertCol = 'alert_id'

  static readCol = 'read'

  static async createAlert (text) {
    await sql.insert(UserAlerts.alertTable, [UserAlerts.textCol, UserAlerts.timestampCol].join(', '), [text, Date.now()])
    return await sql.getBiggestSerial(UserAlerts.alertTable)
  }

  static async sendAlert (user, alert) {
    await sql.insert(
      UserAlerts.userTable,
      [UserAlerts.userCol, UserAlerts.alertCol, UserAlerts.readCol].join(', '),
      [user, alert, 0]
    )
  }

  static async markAsRead (user, alert) {
    const row = (await sql.selectAndEquals(
      UserAlerts.userTable,
      [UserAlerts.userCol, UserAlerts.alertCol].join(', '),
      [user, alert]
    ))[0]
    if (!row) return
    await sql.updateById(UserAlerts.userCol, UserAlerts.readCol, [1], row.id)
  }

  static async sendItemChangedNotification (item, changer) {
    const className = await ItemClassDatabase.getClassName(item)
    const name = await ItemClassDatabase.getQueryNameById(item)
    const username = await user.getUsername(changer)
    const newAlert = await UserAlerts.createAlert(
      `Item ( ${className} | ${name} ) [ID ${item}] has been updated by ${username}`
    )
    const watchers = await WatchlistHandler.getWatchers(item)
    for (let i = 0; i < watchers.length; i++) {
      await UserAlerts.sendAlert(watchers[i], newAlert)
    }
  }

  static async getUserAlerts (user) {
    const userAlerts = await sql.selectWithColumn(
      UserAlerts.userTable,
      UserAlerts.userCol,
      user
    )

    for (let i = 0; i < userAlerts.length; i++) {
      const old = userAlerts[i]
      const { text, timestamp } = await sql.selectId(UserAlerts.alertTable, old.id)
      userAlerts[i] = { text, timestamp, read: old.read }
    }
    userAlerts.sort((a, b) => b.timestamp - a.timestamp)
    return userAlerts
  }

  static async getNotififInfo (token) {
    const userId = await user.getUserId(token)
    if (userId === undefined) return undefined
    let unread = 0
    const alerts = await UserAlerts.getUserAlerts(userId)
    alerts.forEach(alert => {
      if (alert.read === 0) unread++
    })
    return { alerts: alerts.splice(0, 5), unread }
  }
}

module.exports = UserAlerts
