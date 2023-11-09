const Diff = require('diff')

const sql = require('../database/sql-handler')
const itemClassChanges = require('../item-class/item-class-changes')
const ItemClassDatabase = require('../item-class/item-class-database')
const { itemClassHandler } = require('../item-class/item-class-handler')
const { convertDaysToMs, formatDate } = require('../misc/common-utils')
const jsondiffpatch = require('../item-class/item-class-patcher')
const ObjectPathHandler = require('../misc/object-path-handler')

/** Class that generates data from the frontend that refers to items changing */
class ChangesData {
  /**
   * Get the size of a revision's `data`'s JSON string in bytes
   * @param {number} revId - Id of the revision (`data` is from AFTER the revision)
   * @returns {number} Size in bytes
   */
  static async checkRevisionSize (revId) {
    const text = JSON.stringify(await itemClassChanges.getRevisionData(revId))
    const encoder = new TextEncoder()
    return encoder.encode(text).length
  }

  /**
   * Create object with data for a deletion in a history viewer
   * @param {object} row - Row object for the deletion in the `deletion_log`
   * @param {string} name - Name of the item
   * @param {string} cls - Item's class name
   * @param {string} user - Name of user performing change
   * @returns {object} Object with the data
   */
  static createDeletionInfo (row, name, cls, user) {
    return {
      deletionLog: true,
      deletion: row.is_deletion,
      timestamp: row.timestamp,
      cls,
      name,
      row,
      user,
      userId: row.wiki_user,
      id: row.item_id,
      tags: row.tags
    }
  }

  /**
   * Create object with data for a revision in a history viewer
   * @param {object} old - Row object for the previous revision
   * @param {object} cur - Row object for this revision
   * @param {number} delta - Size difference between revisions
   * @param {string} name - Name of the item
   * @param {string} className - Item's class name
   * @param {string} user - Name of the user who created the revision
   * @returns {object} Object with the data
   */
  static createRevisionInfo (old, cur, delta, name, className, user) {
    return {
      delta,
      timestamp: cur.timestamp,
      cls: className,
      name,
      old: old ? old.id : undefined,
      cur: cur.id,
      user,
      userId: cur.wiki_user,
      id: cur.item_id,
      tags: cur.tags
    }
  }

  /**
   * Get the name from the user performing a change
   * @param {object} row - Change's row object
   * @returns {string} Username
   */
  static async getUser (row) {
    return (await sql.selectId('wiki_users', row.wiki_user)).name
  }

  /**
   * Get the last revisions in a time frame
   * @param {number} days - Number of days before today to include
   * @param {number} number - Maximum number of changes to include
   * @param {function(object) : boolean} filterfn - Function that takes as argument a revision or deletion's row object and returns `true` if it should be used in the final list
   * @returns {object[]} Array where each object has data for a revision or deletion
   */
  static async getLastRevisions (days, number, filterfn = () => true) {
    // days is converted to ms
    const timestamp = Date.now() - convertDaysToMs(days)
    const revs = await sql.selectGreaterAndEqual('revisions', 'timestamp', timestamp)
    const dels = await sql.selectGreaterAndEqual('deletion_log', 'timestamp', timestamp)
    const rows = revs.concat(dels).filter(filterfn)
    rows.sort((a, b) => {
      return Number(b.timestamp) - Number(a.timestamp)
    })
    const classes = itemClassHandler.classes
    const latest = []

    for (let i = 0; i < rows.length && i < number + 1; i++) {
      const row = rows[i]
      const name = await ItemClassDatabase.getQueryNameById(row.item_id)
      const cls = await ItemClassDatabase.getClass(row.item_id)
      const className = classes[cls].name
      if (row.is_deletion === undefined) {
        const next = await itemClassChanges.getNextRev(row.id)
        if (next) {
          const sizes = [row.id, next]
          for (let i = 0; i < 2; i++) {
            sizes[i] = await ChangesData.checkRevisionSize(sizes[i])
          }
          const nextRow = await sql.selectId('revisions', next)
          const delta = sizes[1] - sizes[0]
          const user = await ChangesData.getUser(nextRow)

          latest.push(ChangesData.createRevisionInfo(row, nextRow, delta, name, className, user))
        }
      } else {
        latest.push(ChangesData.createDeletionInfo(row, name, className, await ChangesData.getUser(row)))
      }

      if (row.created && row.timestamp > timestamp) {
        latest.push(ChangesData.createRevisionInfo(undefined, row, await ChangesData.checkRevisionSize(row.id), name, className, (await sql.selectId('wiki_users', row.wiki_user)).name))
      }
    }

    // add rollbackable changes
    const foundItems = []

    for (let i = 0; i < latest.length; i++) {
      const change = latest[i]
      if (!foundItems.includes(change.id)) {
        foundItems.push(change.id)
        if (!await ItemClassDatabase.isDeleted(change.id)) {
          latest[i].rollback = true
        }
      }
    }

    latest.sort((a, b) => {
      return Number(b.timestamp) - Number(a.timestamp)
    })
    return latest
  }

  /**
   * Get the difference between two revisions
   * @param {ItemData} old - Data for the older revision
   * @param {ItemData} cur - Data for the newer revision
   * @returns {object[]} An array where each element is an object containing the diff information
   */
  static getRevDiff (old, cur, cls) {
    const structure = itemClassHandler.classes[cls].structure
    const diffs = []
    const diff = jsondiffpatch.diff(old, cur)

    function checkArray (content, diff, path, prettyPath, matrix) {
      if (matrix) {
        path.push('value')
        diff = diff.value
      }
      const arrayDiffs = []
      const oldArray = ObjectPathHandler.readObjectPath(old, path)
      const curArray = ObjectPathHandler.readObjectPath(cur, path)
      const oldLength = oldArray.length
      const curLength = curArray.length
      // taking care of everything except the added entries!
      for (let i = 0; i < oldLength; i++) {
        const newPrettyPath = [...prettyPath, i]
        // in here, right entry corresponds to things that changed, using the index of the NEW array
        const rightEntry = diff[i + '']

        if (rightEntry !== undefined) {
          // an object's content will be stored as an array
          if (Array.isArray(content)) {
            checkObject(content, rightEntry.value, [...path, i, 'value'], newPrettyPath)
          } else {
            diffs.push(new SimpleDiff(newPrettyPath, content, rightEntry[0], rightEntry[1]))
          }
        }

        // left entry corresponds to things that were removed/moved, using the index of the OLD array
        const leftEntry = diff['_' + i]

        if (leftEntry !== undefined) {
          const magicNumber = leftEntry[2]
          // moving
          if (magicNumber === 3) {
            const newIndex = leftEntry[1]
            arrayDiffs.push(new ArrayMoveDiff(matrix, i, newIndex, oldArray[i].value, content))
            arrayDiffs.push(new ArrayMoveDiff(matrix, newIndex, i, oldArray[newIndex].value, content))
          // removing
          } else if (magicNumber === 0) {
            arrayDiffs.push(new ArrayDeleteDiff(i, matrix, oldArray[i].value, content))
          }
        }
      }

      for (let i = oldLength; i < curLength; i++) {
        arrayDiffs.push(new ArrayAddDiff(i, matrix, curArray[i].value, content))
      }

      if (arrayDiffs.length > 0) {
        diffs.push(new ArrayDiff([...prettyPath], arrayDiffs))
      }
    }

    function checkObject (content, diff, path = [], prettyPath = []) {
      content.forEach(prop => {
        const delta = diff[prop.property]
        if (delta) {
          const newPath = [...path, prop.property]
          const newPrettyPath = [...prettyPath, prop.name]

          if (prop.array) {
            checkArray(prop.content, delta, newPath, newPrettyPath, prop.matrix)
          } else if (prop.object) {
            checkObject(prop.content, delta, newPath, newPrettyPath)
          } else {
            // for normal properties, it is expected only to change
            diffs.push(new SimpleDiff(newPrettyPath, prop.content, delta[0], delta[1]))
          }
        }
      })
    }

    checkObject(structure, diff)

    return diffs
  }
}

/**
 * Prototype for an object that contains the data for an item's revision
 */
class DiffItem {
  constructor (path, type) {
    this.path = path || []
    this.type = type
  }
}

/**
 * Object containing information for a property change
 */
class SimpleDiff extends DiffItem {
  /**
   *
   * @param {any[]} path - Pretty path for the property
   * @param {string} content - Property's content, which is a id string like "TEXTSHORT"
   * @param {any} old - Old value
   * @param {any} cur - New value
   */
  constructor (path, content, old, cur) {
    super(path, 'simple')
    this.old = old
    this.cur = cur
    this.content = content
    if (content === 'TEXTSHORT') {
      old = old || ''
      cur = cur || ''
      this.delta = Diff.diffChars(old, cur)
    } else if (content === 'TEXTLONG') {
      old = old || ''
      cur = cur || ''
      const diffLines = Diff.diffLines(old, cur)
      const changes = []
      for (let i = 0; i < diffLines.length; i++) {
        const line = diffLines[i]
        const nextLine = diffLines[i + 1]
        if (nextLine && nextLine.added && line.removed) {
          changes.push({
            type: 'change',
            value: Diff.diffChars(line.value, nextLine.value)
          })
          i++
        } else {
          if (line.added || line.removed) {
            changes.push({
              type: line.added ? 'add' : 'remove',
              value: line.value
            })
          }
        }
      }
      this.delta = changes
    } else if (content === 'ID') {
      this.old = old
      this.cur = cur
    } else if (content === 'DATE') {
      [this.old, this.cur] = [old, cur].map((date) => {
        if (!date) { return '' }
        return formatDate(new Date(date))
      })
      this.delta = Diff.diffChars(this.old, this.cur)
    } else if (content === 'BOOLEAN') {
      this.old = old ? 'Yes' : 'No'
      this.cur = cur ? 'Yes' : 'No'
    }
  }
}

/**
 * Prototype for an object that contains the data for a change within an array
 */
class ArrayDiffItem {
  /**
   *
   * @param {bool} isMatrix - If `true`, the array is a matrix, otherwise it is a list
   * @param {string} type - Type of change, can be `move`, `delete` or `add`
   * @param {any} value - Value of the element in the array in the data object
   * @param {object[]|string} content - Content for the element, which can be a string or an array of objects
   */
  constructor (isMatrix, type, value, content) {
    this.isMatrix = isMatrix
    this.type = type
    this.value = value
    this.content = content
  }
}

/**
 * Object containing information for an element that was moved in an array
 */
class ArrayMoveDiff extends ArrayDiffItem {
  /**
   *
   * @param {bool} isMatrix - If `true`, the array is a matrix, otherwise it is a list
   * @param {number} oldIndex - Index in the old array
   * @param {number} curIndex - Index in the new array
   * @param {any} value - Value of the element in the array in the data object
   * @param {object[]|string} content - Content for the element, which can be a string or an array of objects
   */
  constructor (isMatrix, oldIndex, curIndex, value, content) {
    super(isMatrix, 'move', value, content)
    this.oldIndex = oldIndex
    this.curIndex = curIndex
  }
}

/**
 * Object containing information for an element that was deleted from an array
 */
class ArrayDeleteDiff extends ArrayDiffItem {
  /**
   *
   * @param {number} index - Index in the original array
   * @param {bool} isMatrix - If `true`, the array is a matrix, otherwise it is a list
   * @param {any} value - Value of the element in the array in the data object
   * @param {object[]|string} content - Content for the element, which can be a string or an array of objects
   */
  constructor (index, isMatrix, value, content) {
    super(isMatrix, 'delete', value, content)
    this.index = index
  }
}

/**
 * Object containing information for an element that was added to an array
 */
class ArrayAddDiff extends ArrayDiffItem {
  /**
   *
   * @param {number} index  - Index in the new array
   * @param {bool} isMatrix - If `true`, the array is a matrix, otherwise it is a list
   * @param {any} value - Value of the element in the array in the data object
   * @param {object[]|string} content - Content for the element, which can be a string or an array of objects
   */
  constructor (index, isMatrix, value, content) {
    super(isMatrix, 'add', value, content)
    this.index = index
  }
}

/**
 * Object containing information for an array change
 */
class ArrayDiff extends DiffItem {
  /**
   *
   * @param {(string|number)[]} path - Pretty path for the array
   * @param {ArrayDiffItem[]} diffs - Array of objects containing the data for the inner array changes
   */
  constructor (path, diffs) {
    super(path, 'array')
    this.diffs = diffs
  }
}

module.exports = ChangesData
