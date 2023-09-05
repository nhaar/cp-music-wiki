/**
 * List of all JavaScript JSX component file names encrypted
 *
 * The purpose to encrypt them is so that they don't show up with their development name in the public folder and avoid
 * naming conflicts when doing researches
 */
module.exports = require('./auto-list').map(name => {
  return require('./hasher')(name)
})
