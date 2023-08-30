/**
 * Class with helper methods for sending express responses with a JSON body
 */
class JSONErrorSender {
  /**
   * Send a not found response with a single message included inside a JSON body
   * @param {import('express').Response} res - Express response
   * @param {string} msg - Error message
   */
  static sendNotFound (res, msg) {
    JSONErrorSender.sendStatusJSON(res, 404, { error: msg })
  }

  /**
   * Send a bad request response with a single message included inside a JSON body
   * @param {import('express').Response} res - Express response
   * @param {string} msg - Error message
   */
  static sendBadReq (res, msg) {
    JSONErrorSender.sendBadReqJSON(res, { error: msg })
  }

  /**
   * Send a bad request response using JSON
   * @param {import('express').Response} res - Express response
   * @param {object} obj - Object to deliver in JSON format
   */
  static sendBadReqJSON (res, obj) {
    JSONErrorSender.sendStatusJSON(res, 400, obj)
  }

  /**
   * Send a response using JSON
   * @param {import('express').Response} res - Express response
   * @param {number} status - HTTP status number
   * @param {object} obj - Object to deliver in JSON format
   */
  static sendStatusJSON (res, status, obj) {
    JSONErrorSender.res.status(status).send(obj)
  }
}

module.exports = JSONErrorSender
