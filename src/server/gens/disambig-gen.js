const { getGetter, getParser } = require('./base-item-list')

/** Page generator for disambiguation pages */
module.exports = {
  getter: getGetter('disambiguation'),
  parser: getParser('disambiguation'),
  file: 'DisambigGen'
}
