const { exec } = require('child_process')
const config = require('../../../config')
const path = require('path')
const fs = require('fs')
const cron = require('node-cron')

/**
 * Class that handles backups
 */
class Backuper {
  /**
   * Schedule backups
   */
  static scheduleBackups () {
    if (!fs.existsSync(Backuper.backupFolder)) {
      fs.mkdirSync(Backuper.backupFolder)
    }

    // backup every day at midnight or if not backed up today yet
    if (!Backuper.isTodayBackedUp()) {
      Backuper.backup()
    }

    cron.schedule('0 0 * * *', () => {
      Backuper.backup()
    })
  }

  /**
   * Path to the backup folder
   */
  static backupFolder = path.join(__dirname, '../../../backups')

  /**
   * Get the start part of the backup names
   * @param {Date} date - Date to get the name for
   * @returns {string}
   */
  static getBackupNameDayPart (date) {
    const numbers = [
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ].map(number => (number + '').padStart(2, '0'))
    return `backup_${numbers.join('_')}`
  }

  /**
   * Get the name for a backup for the current date
   * @returns {string}
   */
  static getBackupName () {
    const now = new Date()

    const numbers = [
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ].map(number => (number + '').padStart(2, '0'))
    return `${Backuper.getBackupNameDayPart(now)}_${numbers.join('_')}`
  }

  /**
   * Whether a backup for today exists
   * @returns {boolean} `true` if a backup for today exists, `false` otherwise
   */
  static isTodayBackedUp () {
    const today = Backuper.getBackupNameDayPart(new Date())
    const files = fs.readdirSync(Backuper.backupFolder)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.includes(today)) {
        return true
      }
    }
    return false
  }

  /**
   * Backup the database
   */
  static backup () {
    let passwordSetter

    // other OSs not supported
    if (process.platform === 'win32') {
      passwordSetter = `SET PGPASSWORD=${config.PG_PASSWORD}&&`
    } else if (process.platform === 'linux') {
      passwordSetter = `PGPASSWORD=${config.PG_PASSWORD}`
    }

    const fileName = path.join(Backuper.backupFolder, `${Backuper.getBackupName()}.sql`)

    const dumpCommand = `${passwordSetter} pg_dump -U ${config.PG_USER} -h 127.0.0.1 -w -F p -f "${fileName}" -d ${config.PG_DATABASE}`

    exec(dumpCommand, (err, stdout, stderr) => {
      if (err) {
        throw err
      }
      if (stderr) {
        console.log(stderr)
        return
      }
      console.log(stdout)
    })
  }
}

module.exports = Backuper
