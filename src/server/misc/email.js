const nodemailer = require('nodemailer')
const { EMAIL } = require('../../../config')

/** Class that handles sending emails */
class EmailSender {
  /** `nodemailer` object initiated with the data given inside the `config` file */
  transporter = nodemailer.createTransport(EMAIL)

  /** Email address that will be used to send emails */
  origin = EMAIL.auth.user

  /**
   * Send an email
   * @param {string} recipient - Email address receiving the email
   * @param {string} subject - Subject of the email
   * @param {string} text - Email text body
   */
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
