const clsys = require('../database/class-system')
const sql = require('../database/sql-handler')

module.exports = {
  async getter () {
    const allIds = (await sql.selectWithColumn('items', 'cls', 'song')).map(row => row.id)
    const names = []
    for (let i = 0; i < allIds.length; i++) {
      names.push(await clsys.getQueryNameById(allIds[i]))
    }

    return names
  },
  async parser (name) {
    return (await sql.selectRegex('items', 'querywords', `^${name}(&&|$)`, 'cls', 'song'))[0]
  },
  file: 'song-gen'
}
