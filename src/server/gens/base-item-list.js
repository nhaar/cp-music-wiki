const clsys = require('../database/class-system')
const sql = require('../database/sql-handler')

module.exports = {
  getGetter (cls) {
    return async () => {
      const allIds = (await sql.selectWithColumn('items', 'cls', cls)).map(row => row.id)
      const names = []
      for (let i = 0; i < allIds.length; i++) {
        names.push(await clsys.getQueryNameById(allIds[i]))
      }

      return names
    }
  },
  getParser (cls) {
    return async (name) => {
      const row = (await sql.selectRegex('items', 'querywords', `^${name}(&&|$)`, 'cls', cls))[0]
      return Object.assign(row, { categories: [], name })
    }
  }
}
