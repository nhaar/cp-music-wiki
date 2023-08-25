class Predefined {
  constructor (cls, data, id) {
    Object.assign(this, { cls, data, id })
  }
}

module.exports = [
  new Predefined('category', { name: 'OST List' }, 1)
]
