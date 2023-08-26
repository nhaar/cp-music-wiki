const { getGetter, getParser } = require('./base-item-list')

module.exports = {
  getter: getGetter('song'),
  parser: getParser('song'),
  file: 'SongGen'
}
