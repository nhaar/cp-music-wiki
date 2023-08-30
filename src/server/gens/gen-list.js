const sql = require('../database/sql-handler')
const { getRandomInt } = require('../misc/server-utils')

class ListGen {
  constructor () {
    this.lists = [
      require('./song-gen'),
      require('./ost-gen'),
      require('./disambig-gen')
    ]
  }

  async getAllNames () {
    const names = []
    for (let i = 0; i < this.lists.length; i++) {
      names.push(...(await this.lists[i].getter()))
    }
    return names
  }

  async searchPages (keyword) {
    return (await this.getAllNames())
      .filter(name => name.match(new RegExp(`${keyword}`, 'i')))
  }

  async getRandomName () {
    const names = await this.getAllNames()
    return names[getRandomInt(0, names.length)]
  }

  async findName (name) {
    for (let i = 0; i < this.lists.length; i++) {
      const list = this.lists[i]
      if ((await list.getter()).includes(name)) return list
    }
  }

  async getAllParsed () {
    const parsed = []
    for (let i = 0; i < this.lists.length; i++) {
      const list = this.lists[i]
      parsed.push(...await Promise.all((await list.getter()).map(name => list.parser(name))))
    }
    return parsed
  }

  async getCategoryId (name) {
    const result = await sql.selectAndEquals('items', 'cls, querywords', ['category', name])
    return result.length && result[0].predefined
  }

  async parseWithCategoryNames (callback, value) {
    const data = await callback(value)
    const categoryNames = []
    for (let i = 0; i < data.categories.length; i++) {
      categoryNames.push((await sql.selectAndEquals(
        'items', 'cls, predefined', ['category', data.categories[i]]
      ))[0].querywords)
    }
    data.categoryNames = categoryNames
    return data
  }

  async getPagesInCategory (category) {
    const id = await this.getCategoryId(category)
    return (await this.getAllParsed()).filter(page => page.categories.includes(id)).map(page => page.name)
  }
}

module.exports = new ListGen()
