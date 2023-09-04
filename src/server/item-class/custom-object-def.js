/** Class with the information needed to define a custom item object type */
class CustomObjectDef {
  /**
   * Construct the definition object
   * @param {CPT} code - The `CPT` string which contains the declaration for all properties within the item class
   * @param {ItemRuleValidator[]} validators - A list of all data validators for the item class
   */
  constructor (code, validators = []) {
    Object.assign(this, { code, validators })
  }
}

module.exports = CustomObjectDef
