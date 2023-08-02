const fs = require('fs')
const path = require('path')

const db = require('./database')

class SongInstance {
  constructor (name, date, song, estimate) {
    Object.assign(this, { name, date, song, estimate })
  }
}

class Generator {
  /**
   *
   * @param {WikiDatabase} db
   */
  constructor (db) {
    this.db = db
  }

  async generateFlashOST () {
    const tables = [
      'flash_room',
      'flash_party',
      'music_catalogue',
      'stage_play',
      'flash_minigame',
      'flash_misc'
    ]
    for (let i = 0; i < tables.length; i++) {
      tables[i] = await db.handler.selectAll(tables[i])
    }
    const songs = await db.handler.selectAll('song')
    const authors = await db.handler.selectAll('author')
    const sources = await db.handler.selectAll('source')

    const songPriority = {}
    songs.forEach(song => {
      songPriority[song.id] = song.data.priority
    })

    const instances = []

    const tableIterate = (rows, useVar, callbackfn) => {
      rows.forEach(row => {
        const { data } = row
        data[useVar].forEach(use => {
          const instance = callbackfn(use, data)
          if (instance) instances.push(instance)
        })
      })
    }

    tableIterate(tables[0], 'songUses', (use, data) => {
      if (!use.isUnused) {
        return new SongInstance(
          data.name,
          use.available.start.date,
          use.song,
          use.available.start.isEstimate
        )
      }
    })
    tableIterate(tables[1], 'partySongs', (use, data) => {
      if (!use.isUnused) {
        const { usePartyDate } = use
        const date = usePartyDate
          ? data.active.start.date
          : use.available.start.date
        const estimate = usePartyDate
          ? false
          : use.available.start.isEstimate

        return new SongInstance(
          data.name,
          date,
          use.song,
          estimate
        )
      }
    })

    tableIterate(tables[2], 'songs', (gridRow, data) => {
      gridRow.forEach(song => {
        return new SongInstance(
          'Igloo',
          data.launch.date,
          song.song,
          data.launch.isEstimate
        )
      })
    })

    tableIterate(tables[3], 'appearances', (use, data) => {
      if (!use.isUnused) {
        return new SongInstance(
          data.name,
          use.appearance.start.date,
          use.song,
          use.appearance.start.isEstimate
        )
      }
    })

    tableIterate(tables[4], 'songs', (use, data) => {
      if (!use.isUnused) {
        const { useMinigameDates } = use
        const date = useMinigameDates
          ? data.available.start.date
          : use.available.start.date
        const estimate = useMinigameDates
          ? false
          : use.available.start.isEstimate
        return new SongInstance(
          data.name,
          date,
          use.song,
          estimate
        )
      }
    })

    tables[5].forEach(use => {
      if (!use.isUnused) {
        instances.push(
          new SongInstance(
            use.name,
            use.available.start.date,
            use.song,
            use.available.start.isEstimate
          )
        )
      }
    })

    instances.sort((a, b) => {
      const ab = [a, b]
      const dates = ab.map(instance => Date.parse(instance.date))

      const difference = dates[0] - dates[1] || 0
      if (difference === 0) {
        const priorities = [a, b].map(instance => songPriority[instance.song])
        return priorities[0] - priorities[1] || 0
      } else {
        return difference
      }
    })

    const list = []
    const addedSongs = {}

    let order = 0
    instances.forEach(instance => {
      const { song } = instance
      console.log(addedSongs)
      if (!Object.keys(addedSongs).includes(song + '')) {
        order++
        const songRow = findByKey(songs, 'id', song)
        addedSongs[song] = order
        const songData = songRow.data

        const authorsList = songData.authors.map(author => {
          return findByKey(authors, 'id', author.author).data.name
        })

        const altNames = (songData.names.splice(1)).map(name => name.name)

        const hqSources = []
        songData.files.forEach(file => {
          if (file.isHQ) {
            const sourceName = findByKey(sources, 'id', file.source).data.name

            hqSources.push(sourceName)
          }
        })

        const date = instance.estimate
          ? '?'
          : instance.date

        list.push([
          songData.names[0].name,
          authorsList.join(', '),
          order,
          songData.link,
          instance.name,
          altNames.join(', '),
          hqSources.join(' + '),
          date
        ])
      } else {
        console.log(addedSongs[song], list)
        list[addedSongs[song] - 1][4] += `, ${instance.name}`
      }
    })

    const flashOST = this.generateHTML(list)
    fs.writeFileSync(path.join(__dirname, '../views/generated/series-list.html'), flashOST)
  }

  /**
   * Creates a table HTML for a two-dimensional series list
   * @param {*[][]} matrix
   * @returns {string}
   */
  generateHTML (matrix) {
    let tableHTML = ''
    matrix.forEach(row => {
      let rowHTML = ''
      row.forEach(column => {
        rowHTML += `<td> ${column} </td>`
      })
      tableHTML += `<tr> ${rowHTML} </tr>`
    })

    return `
      <!DOCTYPE html>

      <head>

      </head>

      <body>
        <table>
          <tr>
            <th> Name </th>
            <th> Composers </th>
            <th> Order </th>
            <th> Link </th>
            <th> Related To </th>
            <th> Alternate Names </th>
            <th> HQ Source(s) </th>
            <th> EarliestDate </th>
          </tr>
          ${tableHTML}
        </table>
      </body>
    `
  }

  /**
   * Update the list files
   */
  async updateLists () {
    // const list = await this.generateLists([0, 1])
    // const seriesHTML = await this.generateHTML(list[0])
    // fs.writeFileSync(path.join(__dirname, '../views/generated/series-list.html'), seriesHTML)
  }
}

function findByKey (array, key, value) {
  for (let i = 0; i < array.length; i++) {
    if (array[i][key] === value) return array[i]
  }
}

const gen = new Generator(db)

gen.generateFlashOST()

module.exports = gen
