const jsondiffpatch = require('jsondiffpatch').create({
  textDiff: {
    minLength: Infinity
  },
  objectHash: (obj, i) => {
    return obj.id || i
  }
})

module.exports = jsondiffpatch
