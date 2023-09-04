const path = require('path')

const multer = require('multer')

const user = require('../database/user')
const JSONErrorSender = require('./json-error-sender')
const { getToken } = require('./server-utils')
const { itemClassHandler } = require('../item-class/item-class-handler')

/** Class with express middlewares used in the API routes */
class ApiMiddleware {
  /**
   * Base method to create a middleware function that runs a function to check the request body and if it finds an error
   * it sends a bad request response with a single message included inside a JSON body
   * @param {function(object) : boolean} callback - A function that takes as argument the body of the request (JSON body) and  returns true if the body follows the validation rules
   * @param {string} msg - Error message
   * @returns {function(Request, Response, NextFunction) : void} Express middleware function
   */
  static getValidatorMiddleware (callback, msg) {
    return (req, res, next) => {
      if (callback(req.body)) {
        next()
      } else {
        JSONErrorSender.sendBadReq(res, msg)
      }
    }
  }

  /**
     * Middleware to check if the user requesting is a wiki admin
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     */
  static async checkAdmin (req, res, next) {
    if (await user.isAdmin(getToken(req))) {
      next()
    } else {
      res.sendStatus(403)
    }
  }

  /**
     * Middleware to check if the `cls` appended in the request body is valid
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} - Express next function
     */
  static checkClass = ApiMiddleware.getValidatorMiddleware(body => itemClassHandler.isClassName(body.cls), 'Invalid item class provided')

  /**
     * Middleware to check if the value of the `id` appended in the request body is valid
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} - Express next function
     * */
  static checkId = ApiMiddleware.getValidatorMiddleware(body => Number.isInteger(body.id), 'Id is not an integer')

  /**
     * Middleware to check if the value of a `keyword` appended in the request body is valid
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} - Express next function
     * */
  static checkKeyword = ApiMiddleware.getValidatorMiddleware(body => typeof body.keyword === 'string', 'Invalid keyword')

  /** Middleware that receives and saves a music file */
  static musicUpload = multer({ dest: path.join(__dirname, '../../client/music/') })
}

module.exports = ApiMiddleware
