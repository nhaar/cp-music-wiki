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

function addPath (reference, path) {
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

  iterator(reference, 0)

  return reference
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




/*

ADD/DROP song
ADD static song
ADD property LOCALIZATION_NAME

IN song SET name TEXT
IN static song SET name TEXT
IN property LOCALIZATION_NAME SET name TEXT

IN song DROP name


IN song MAP .name -> .names[0] (* represents arrayfication *)
IN song MAP .names[*] -> .names[*].name (* array mapping *)
IN song MAP .names[0] -> .name (de-arrayfication, I doubt I'll ever use it though)
IN song MAP .name -> .name.name (one to one mapping) 

TRANSFER song [*] TO authors
TRANSFER song [1, 2] TO authors
TRANSFER song [1...3] TO authors
*/

class DatabaseManipulator {
  constructor (code, db) {
    Object.assign(this, { db, code })
  }

  collectCommands (code) {
    const matches = {
      add: code.match(/ADD\s+(?:static\s+|property\s+)?\w+/g),
      drop: code.match(/DROP\s+(?:static\s+)?\w+/g),
      set: code.match(/IN\s+(?:static\s+|property\s+)?\w+\s+SET\s+\w+\s+\w+(\[\])*/g),
      map: code.match(/MAP\s+\w+(\.\w+|\[[^\]]*\])*\s+->\s+\w+(\.\w+|\[[^\]]*\])*/g),
      transfer: code.match(/TRANSFER\s+\w+\s+\[(\*|\d+(?:\s*(,|...)\s*\d+)*)\]\s+TO\s+\w+/g)
    }
  
    return matches
  }

  evaluateAdd (code) {
    const words = code.match(/\w+/g)
    let type
    if (words.length === 2) {
      type = words[1]
      db.handler.createType(type)
    } else {
      type = words[2]
      if (words[1] === 'static') {
        db.handler.insertStatic(type, {})
      }
    }
  }

  evaluateSet (code) {
    const tableDeclr = code.match(/(?<=IN\s+)(?:(static|property)\s+)?\w+/)[0]
    const tableName = tableDeclr.match(/(?!(static|property))(?<=\s)\w+/)[0]
    const setDeclr = code.match(/(?<=SET\s+)\w+\s+\w+(\[\])*/)[0]
    const propAndType = setDeclr.match(/\w+(\[\])*/g)
    console.log(propAndType)

    if (tableDeclr.includes('static')) {

    } else if (!tableDeclr.includes('property')) {
      
    }
  }

  setInObject(object, property, type) {
    if (type.includes('[')) {
      object[property] = []
    } else if (db.standardVariables.includes(type)) {
      object[property] = null
    } else {
      object[property] = db.defaults[type]
    }
  }

  dropInObject(object, property) {
    delete object[property]
  }

  mapInObject(object1, object2, path1, path2, tpath) {
    const paths = [path1, path2]
    // check whether it is an array mapping or not
    const arrayMapping = paths.map(path => path.includes('[*]'))
    // if (arrayMapping[0] && arrayMapping[1]) {
      // one to one mapping
    const steps = paths.map(path => path.match(/(?<=\.)\w+|(?<=\[).(?=\])/g))
    const readIterator = (reading, i = 0) => {
      if (i < steps[0].length) {
        const step = steps[0][i]
        if (step === '*') {
          const children = []
          reading.forEach(next => {
            children.push(readIterator(next, i + 1))
          })
          return children
        } else {
          const next = reading[step]
          return readIterator(next, i + 1)
        }
      } else {
        return reading
      }
    }

    const reading = readIterator(object1)
    console.log(reading)
    // let reading = object1
    // steps[0].forEach(step => {
    //   reading = reading[step]
    // })

    const assignIterator = (assigning, currentReading, i = 0) => {
      const step = steps[1][i]
      const curType = tpath[i]

      console.log(steps[1], steps[1][i], i)

      if (i < steps[1].length - 1) {
        if (step === '*') {
          currentReading.forEach((nextReading) => {
            let next
            if (curType === '[]') next = []
            else next = deepcopy(db.defaults[curType])
            assigning.push(next)
            assignIterator(next, nextReading, i + 1)
          })
        } else {
          console.log('hello')
          const next = assigning[step]
          if (!next) {
            console.log('heyo',curType, tpath, i)
            if (curType === '[]') assigning[step] = []
            else assignPath[step] = deepcopy(db.defaults[curType])
          }

          assignIterator(assigning[step], currentReading, i + 1)
        }
      } else {
        if (step === '*') {
          currentReading.forEach((nextReading) => {
            assigning.push(nextReading)
          })
        } else {
          assigning[step] = currentReading
        }
        // let newAssign = reading
        // for (let j = 0; j < indexes.length - 1; j++) {
        //   newAssign = newAssign[indexes[j]]
        // }
        // assigning[step] = newAssign
      }
    }

    assignIterator(object2, reading)
    // let assigning = object2
    // steps[1].forEach((step, i) => {
    //   if (i < steps[1].length - 1) {
    //     assigning = assigning[step]
    //   } else {
    //     assigning[step] = reading
    //   }
    // })
    // } else if (!arrayMapping[0] && !arrayMapping[1]) {

    // } else {
    //   throw new Error('Array mapping must be in both sides')
    // }
  }

  async updatePatches (type, callback) {
    // find biggest ID to iterate through everything
    const seq = await db.handler.getBiggestSerial(type)
    // iterate every ID, presuming no deletion
    for (let i = 1; i <= seq; i++) {
      let versions = await getAllVersions(type, i)
      versions = versions.map(version => callback(version))
      overridePatches(type, i, versions)
    }
  }
}

const dbm = new DatabaseManipulator()

const test = {
  names: [
    'a',
    'b',
    'c'
  ]
}

const testerino = {
  names: []
}

// console.log(db.defaults['NAME '])
// dbm.mapInObject(test, testerino, '.name[*]', '.names[*].name')

dbm.mapInObject(test, testerino, '.names[*]', '.names[*].name',
['[]', 'NAME', 'TEXT'])

// `
// .names[*].name
// [] NAME TEXT
// `

console.log(testerino)