const jsondiffpatch = require('jsondiffpatch').create({
  objectHash: (obj, i) => {
    return obj.id || i
  }
})

module.exports = jsondiffpatch
