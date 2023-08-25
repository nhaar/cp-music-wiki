class ListGen {
  constructor () {
    this.lists = [
      require('./song-gen')
    ]
  }

  async findName (name) {
    for (let i = 0; i < this.lists.length; i++) {
      const list = this.lists[i]
      const names = await list.getter()
      if (names.includes(name)) return list
    }
  }
}

module.exports = new ListGen()
