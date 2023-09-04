const CustomObjectDef = require('./custom-object-def')

/** Class with the information needed to define an item class */
class ItemClassDef extends CustomObjectDef {
  /**
   * Construct the definition object
   * @param {string} name - The "pretty name" for the item class
   * @param {CPT} code - The `CPT` string which contains the declaration for all properties within the item class
   * @param {ItemRuleValidator[]} validators - A list of all data validators for the item class
   */
  constructor (name, code, validators = []) {
    super(code, validators)
    Object.assign(this, { name })
  }
}

module.exports = ItemClassDef
