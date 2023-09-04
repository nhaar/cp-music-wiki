/** Class objects are containers of methods to validate data from a class using a rule */
class ItemRuleValidator {
  /**
   * @param {function(ItemData) : boolean} f - A function that takes as argument an item's `data` object, and returns `true` if the object is following the rule assigned to this validator, else it returns `false`, indicating the data is not valid
   * @param {string} msg - Error message to display for the data if it is invalid
   */
  constructor (f, msg) {
    Object.assign(this, { f, msg })
  }

  /**
   * Check if the rule is followed
   * @param {ItemData} itemData - `data` object for an item
   * @param {array} errors Reference to an array that will store the rror
   */
  checkRule (itemData, errors) {
    if (!this.f(itemData)) throw errors.push(this.msg)
  }
}

module.exports = ItemRuleValidator
