const { getGetter, getParser } = require('./base-item-list')

/** Page generator for song pages */
module.exports = {
  getter: getGetter('song'),
  parser: getParser('song'),
  file: 'SongGen'
}
