class ListGen {
  constructor () {
    this.lists = [
      require('./song-gen')
    ]
  }

  async getAllNames () {
    const names = []
    for (let i = 0; i < this.lists.length; i++) {
      names.push(...(await this.lists[i].getter()))
    }
    return names
  }

  async findName (name) {
    for (let i = 0; i < this.lists.length; i++) {
      const list = this.lists[i]
      if ((await list.getter()).includes(name)) return list
    }
  }
}

module.exports = new ListGen()
