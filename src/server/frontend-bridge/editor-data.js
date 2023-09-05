const itemClassChanges = require('../item-class/item-class-changes')
const ItemClassDatabase = require('../item-class/item-class-database')
const { itemClassHandler } = require('../item-class/item-class-handler')
const { deepcopy } = require('../misc/common-utils')

/**
 * Class for creating the data objects used by the frontend editors */
class EditorData {
  /** Build data */
  constructor () {
    this.createPreeditorData()
  }

  /**
   * Get the object with the data for the delete page
   * @param {number} id - Item id
   * @returns {object} Delete data
   */
  async getDeleteData (id) {
    const cls = await ItemClassDatabase.getClass(id)

    const deleteData = deepcopy(itemClassHandler.classes[cls])
    deleteData.refs = await itemClassChanges.checkReferences(id)
    return deleteData
  }

  /** Create the data for the item browser */
  async createPreeditorData () {
    this.preeditor = []

    for (const cls in itemClassHandler.classes) {
      const isStatic = itemClassHandler.isStaticClass(cls)
      const data = { cls, name: itemClassHandler.classes[cls].name, isStatic }
      if (isStatic) {
        data.id = (await ItemClassDatabase.getStaticClass(cls)).id
      }
      this.preeditor.push(data)
    }
  }
}

module.exports = new EditorData()
