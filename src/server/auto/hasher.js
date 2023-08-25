const crypto = require('crypto')

module.exports = (value) => {
  return ((crypto.createHash('sha256')).update(value)).digest('hex')
}
