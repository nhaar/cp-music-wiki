const nodemailer = require('nodemailer')
const { EMAIL } = require('../../../config')

class EmailSender {
  constructor () {
    this.transporter = nodemailer.createTransport(EMAIL)
    this.origin = EMAIL.auth.user
  }

  async sendEmail (recipient, subject, text) {
    await this.transporter.sendMail({
      from: this.origin,
      to: recipient,
      subject,
      text
    })
  }
}

module.exports = new EmailSender()
