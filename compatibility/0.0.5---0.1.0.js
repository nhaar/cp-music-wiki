const sqlHandler = require('../src/server/database/sql-handler')
const { isNumberLike, deepcopy, getUniqueHash } = require('../src/server/misc/common-utils')
const ObjectPathHandler = require('../src/server/misc/object-path-handler')
const RetroUpdate = require('../src/server/retro-update/retro-update')
const lmao = 0

async function getter () {
  return await sqlHandler.selectAll('items')
}

function removeValueFromPath (path) {
  const newPath = deepcopy(path)

  newPath.forEach((step, i) => {
    if (step === 'value' && (isNumberLike(newPath[i + 1]) || i === newPath.length - 1)) {
      newPath.splice(i, 1)
    }
  })

  return newPath
}

function modifier ({ current, previousModified, structure }) {
  const arrayPaths = ObjectPathHandler.findItemPathFromStructure(structure, prop => {
    return prop.array
  })
  const paths = arrayPaths.map(path => ObjectPathHandler.getObjectPathsFromItemPath(path, current)).flat(1)
  const modified = deepcopy(current)

  paths.forEach(path => {
    const arrayElementPath = deepcopy(path)
    arrayElementPath.pop()
    if (arrayElementPath[arrayElementPath.length - 1] === 'value') {
      arrayElementPath.pop()
    }

    const previousArrayElement = ObjectPathHandler.readObjectPath(previousModified, arrayElementPath)
    const previousLength = previousArrayElement.length

    const oldVersionPath = removeValueFromPath(path)
    // needs to do pop after calling removeValueFromPath
    const index = oldVersionPath.pop()
    const arrayElement = ObjectPathHandler.readObjectPath(modified, oldVersionPath)
    const wrapper = { value: arrayElement[index] }
    if (index < previousLength) {
      wrapper.id = previousArrayElement[index].id
    } else {
      wrapper.id = getUniqueHash()
    }
    arrayElement[index] = wrapper
  })

  return modified
}

RetroUpdate.retroUpdate(getter, modifier)
