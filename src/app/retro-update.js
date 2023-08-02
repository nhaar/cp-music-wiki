/*
this file is not accessed by any other file, it is meant to be run standalone
every time a change to the database must be made, this must be accessed first
*/
const fs = require('fs')

const db = require('./database')
const jsondiffpatch = require('jsondiffpatch')
const { deepcopy } = require('./utils')

// list of options:
// * create a new path in a data variable (across all entries in a table)
// * remove a path in a data variable (across all entries in a table)
// * transfer (from one path to another, path includes the table as well) (across all entries in a table)

async function getAllVersions (type, id) {
  const isStatic = type === 'static'
  if (isStatic) type = id
  const table = isStatic ? 'static' : type
  const versions = [db.defaults[type]]
  const patches = await db.handler.selectPatches(type, id)
  patches.forEach((patch, i) => {
    const nextVersion = jsondiffpatch.patch(deepcopy(versions[i]), patch)
    versions.push(nextVersion)
  })

  // fs.writeFileSync('test.json', JSON.stringify(versions, null, 2))

  return versions
}

async function overridePatches (type, id, versions) {
  const patchIds = await db.handler.selectPatchIds(type, id)
  if (versions.length - 1 !== patchIds.length) throw new Error('Versions given cannot describe the patches to override')
  patchIds.forEach((id, i) => {
    const patch = JSON.stringify(jsondiffpatch.diff(versions[i], versions[i + 1]))
    db.handler.update('changes', 'patch', 'id', [id, patch])
  })
}

function addPath (obj, path) {
  const steps = path.match(/\.\w+(\[\])*/g)

  const iterator = (obj, current) => {
    const step = steps[current]
    const dimension = step.match(/(\[\])*/)[0].length
    const property = step.replace(/\[\]|\./g, '')
    const nextObj = obj[property]

    if (step.includes('[')) {
      // finish if the array doesn't exist, other iterate through everything
      if (nextObj) {
        const arrayiterator = (obj, i, dimension) => {
          if (i < dimension) {
            obj.forEach(element => {
              arrayiterator(element, i + 1, dimension)
            })
          } else if (obj.length > 0) {
            obj.forEach(element => {
              iterator(element, current + 1)
            })
          }
        }
        arrayiterator(nextObj, 0, dimension)
      } else {
        obj[property] = []
      }
    } else {
      if (typeof nextObj === 'object') {
        iterator(nextObj, current + 1)
      } else {
        if (current < steps.length - 1) {
          obj[property] = {}
          iterator(obj[property], current + 1)
        } else {
          obj[property] = null
        }
      }
    }
  }

  iterator(obj, 0)

  return obj
}

function dropPath (obj, path) {
  const steps = path.match(/\.\w+(\[\])*/g)

  const iterator = (obj, current) => {
    const step = steps[current]
    const dimension = step.match(/(\[\])*/)[0].length
    const property = step.replace(/\[\]|\./g, '')
    const nextObj = obj[property]
    console.log(step, current, steps.length - 1)

    if (current < steps.length - 1) {
      if (step.includes('[')) {
        if (nextObj) {
          const arrayiterator = (obj, i, dimension) => {
            if (i < dimension) {
              obj.forEach(element => {
                arrayiterator(element, i + 1, dimension)
              })
            } else if (obj.length > 0) {
              obj.forEach(element => {
                iterator(element, current + 1)
              })
            }
          }
          arrayiterator(nextObj, 0, dimension)
        }
      } else {
        if (nextObj) {
          iterator(nextObj, current + 1)
        }
      }
    } else {
      delete obj[property]
    }
  }

  iterator(obj, 0)

  return obj
}

function objectifyPath (obj, path, propName) {
  const steps = path.match(/\.\w+(\[\])*/g)

  const iterator = (obj, current) => {
    const step = steps[current]
    const dimension = step.match(/(\[\])*/)[0].length
    const property = step.replace(/\[\]|\./g, '')
    const nextObj = obj[property]

    if (step.includes('[')) {
      // finish if the array doesn't exist, other iterate through everything
      if (nextObj) {
        const arrayiterator = (obj, i, dimension) => {
          if (i < dimension) {
            obj.forEach(element => {
              arrayiterator(element, i + 1, dimension)
            })
          } else if (obj.length > 0) {
            obj.forEach((element, i) => {
              if (current < steps.length - 1) {
                iterator(element, current + 1)
              } else {
                obj[i] = { [propName]: element }
              }
            })
          }
        }
        arrayiterator(nextObj, 0, dimension)
      } else {
        obj[property] = []
      }
    } else {
      if (typeof nextObj === 'object') {
        iterator(nextObj, current + 1)
      } else {
        if (current < steps.length - 1) {
          obj[property] = {}
          iterator(obj[property], current + 1)
        } else {
          obj[property] = { [propName]: obj[property] }
        }
      }
    }
  }

  iterator(obj, 0)

  return obj
}

function readPath (obj, path) {
  const steps = path.match(/\.\w+|\[.\]/g)
  let output = obj

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i].match(/(?<=\[).(?=\])|(?<=\.)\w+/)[0]
    output = output[step]
  }
  return output
}

function assignPath (obj, path, value) {
  const steps = path.match(/\.\w+|\[.\]/g)
  let output = obj

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i].match(/(?<=\[).(?=\])|(?<=\.)\w+/)[0]

    if (i === steps.length - 1) {
      output[step] = value
    } else {
      output = output[step]
    }
  }
}

async function addPathToAll (type, path) {
  const seq = await db.handler.getBiggestSerial(type)
  for (let i = 1; i <= seq; i++) {
    let versions = await getAllVersions(type, i)
    versions = versions.map(version => addPath(version, path))
    overridePatches(type, i, versions)
  }
}
