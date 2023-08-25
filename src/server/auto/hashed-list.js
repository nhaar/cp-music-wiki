module.exports = require('./auto-list').map(name => {
  return require('./hasher')(name)
})
