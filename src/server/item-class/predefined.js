/** Class that represents a predefined item */
class Predefined {
  /** Construct object */
  constructor (cls, data, id) {
    Object.assign(this, { cls, data, id })
  }
}

/** List of all the predefined items in the database */
module.exports = [
  new Predefined('category', { name: 'OST List' }, 1)
]
