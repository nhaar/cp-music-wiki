/*
this file is not accessed by any other file, it is meant to be run standalone
every time a change to the database must be made, this must be accessed first
*/
const sqlHandler = require('../database/sql-handler')
const jsondiffpatch = require('../item-class/item-class-patcher')
const { deepcopy } = require('../misc/common-utils')
const ItemClassDatabase = require('../item-class/item-class-database')
const { itemClassHandler } = require('../item-class/item-class-handler')
const Backuper = require('../database/backuper')

/**
 * A function that takes as the first argunent the data for an unmodified version for a data object, as the second argument
 * the data for the PREVIOUS modified version of the same item, relative to the unmodified version, and as the third argument
 *  the structure of the item class, and returns the modified version
 *
 * In a simplistic way, if you consider an item as having multiple versions, before any modification:
 *
 * ```js
 * [originalVersion_0, originalVersion_1, ..., originalVersion_i, ... originalVersion_current]
 * ```
 *
 * If the first argument is `originalVersion_i`, then the array of modified versions so far is
 * ```js
 * [modifiedVersion_0, modifiedVersion_1, ..., modifiedVersion_i-1]
 * ```
 *
 * And thus the second argument is `modifiedVersion_i-1`
 * @typedef {function(object, object, ObjectStructure) : object} ModifierFunction
 */

/**
 * An array which represents all versions of a specific type data throught time,
 * with the first element (0th) represents the default type
 * and the last one represents the current versions
 *
 * Since it is linked to the history, by definition its length should be equal
 * to the number of patches for the row + 1 to account for the default version
 * @typedef {TypeData[]} VersionList
 */

class RetroUpdate {
  /**
   * Asynchronously gets all patches for an item, in the order they were applied
   * @param {number} id - Item id
   * @returns {import('../database/sql-handler').Row[]} Array with row for all patches
   */
  static async getsPatches (id) {
    return await sqlHandler.selectWithColumn('revisions', 'item_id', id, '*', true)
  }

  /**
   * Asynchronously get all versions of an item in the order they were created
   * @param {number} id - Item id
   * @returns {object[]} Array with all versions, with the first element being the default version and the last one being the current version
   */
  static async getAllVersions (id) {
    const cls = await ItemClassDatabase.getClass(id)
    const defaultData = itemClassHandler.defaults[cls]
    const versions = [defaultData]
    const patches = (await RetroUpdate.getPatches(id)).map(row => row.patch)
    patches.forEach((patch, i) => {
      const nextVersion = jsondiffpatch.patch(deepcopy(versions[i]), patch)
      versions.push(nextVersion)
    })

    return versions
  }

  /**
   * Transform an array containing all versions of an item into a new array using a modifier function
   * @param {object[]} originalVersions - Array with the original versions, ordered
   * @param {ModifierFunction} modifierFunction - Modifier function for the conversion
   * @param {string} cls - Class of the item
   * @returns {object[]} Array with the modified versions
   */
  static modifyAllVersions (originalVersions, modifierFunction, cls) {
    const structure = itemClassHandler.classes[cls].structure
    const newVersions = [deepcopy(originalVersions[0])]
    let previous = newVersions[0]
    for (let i = 1; i < originalVersions.length; i++) {
      const current = originalVersions[i]
      const modified = modifierFunction(deepcopy(current), deepcopy(previous), structure)
      newVersions.push(modified)
      previous = modified
    }

    return newVersions
  }

  /**
   * Override all data for an item with new versions
   * @param {string} id
   * @param {object[]} versions - Array with all the new versions to override, must be equal to the number of previous versions
   */
  static async overridePatches (id, versions) {
    const patchIds = (await RetroUpdate.getPatches(id)).map(row => row.id)
    if (versions.length - 1 !== patchIds.length) throw new Error('Versions given cannot describe the patches to override')
    patchIds.forEach((id, i) => {
      const patch = JSON.stringify(jsondiffpatch.diff(versions[i], versions[i + 1]))
      sqlHandler.updateById('revisions', 'patch', [patch], id)
    })

    sqlHandler.updateById('items', 'data', [JSON.stringify(versions.pop())], id)
  }

  // name drop!!
  /**
   * Updates the database retroactively, applying a modifier function to all items obtained by a getter function
   * @param {function() : import('../database/sql-handler').Row[]} getterFunction - An asynchronous function that should return a list of all the rows for all the items that will be updated
   * @param {ModifierFunction} modifierFunction - Function to apply to modify the items
   */
  static async retroUpdate (getterFunction, modifierFunction) {
    await Backuper.backup()
    const items = await getterFunction()
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const versions = await RetroUpdate.getAllVersions(item.id)
      const newVersions = RetroUpdate.modifyAllVersions(versions, modifierFunction, item.cls)
      await RetroUpdate.overridePatches(item.id, newVersions)
    }
  }
}

module.exports = RetroUpdate
