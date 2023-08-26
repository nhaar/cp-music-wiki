const { getGetter, getParser } = require('./base-item-list')

module.exports = {
  getter: getGetter('disambiguation'),
  parser: getParser('disambiguation'),
  file: 'DisambigGen'
}
