const fs = require('fs')
const path = require('path')

const db = require('./database')

class SongInstance {
  constructor (name, dateEst, song) {
    const properSong = typeof song === 'object' ? song.song : Number(song)
    Object.assign(this, { name, date: dateEst.date, song: properSong, estimate: dateEst.isEstimate })
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

  async OSTListGenerator (...mediaList) {
    const songs = await db.handler.selectAll('song')
    const authors = await db.handler.selectAll('author')
    const sources = await db.handler.selectAll('source')

    const songPriority = {}
    songs.forEach(song => {
      songPriority[song.id] = song.data.priority
    })

    let instances = []

    let tables

    const base1 = (uses, callback) => {
      uses.forEach(use => {
        const args = callback(use)
        if (args) {
          instances.push(new SongInstance(...args.concat(use)))
        }
      })
    }

    const base2 = (row, callback) => {
      const { data } = row
      return callback(data)
    }

    const base3 = (use, callback) => {
      if (!use.isUnused) return callback(use)
    }

    const base4 = (data, use, useKey, dateKey) => {
      const useParent = use[useKey]
      const date = useParent
        ? data[dateKey].start
        : use.available.start

      return [data.name, date]
    }

    const base5 = (uses, callback) => {
      base1(uses, use => {
        return base3(use, callback)
      })
    }

    const base6 = (i, key, callback) => {
      tables[i].forEach(row => {
        base2(row, data => {
          base5(data[key], use => callback(use, data))
        })
      })
    }

    const base7 = (i, key, useKey, dateKey) => {
      base6(i, key, (use, data) => base4(data, use, useKey, dateKey))
    }

    const base8 = key => (use, data) => [data.name, use[key].start]

    const base9 = base8('available')

    const base10 = (i) => {
      base1(tables[i], use => {
        return base2(use, data => {
          return [data.name, data.available.start, data]
        })
      })
    }

    class MediaInfo {
      constructor (name, updateMethod, dest, ...tables) {
        Object.assign(this, { name, updateMethod, dest, tables })
      }
    }

    const medias = {
      flash: new MediaInfo(
        'Club Penguin (Flash)',
        () => {
          // room music
          base6(0, 'songUses', base9)

          // party music
          base7(1, 'partySongs', 'usePartyDate', 'active')

          // igloo music
          tables[2].forEach(row => {
            base2(row, data => {
              data.songs.forEach(gridRow => {
                base5(gridRow, () => ['Igloo', data.launch])
              })
            })
          })

          // stage music
          base6(3, 'appearances', base8('appearance'))

          // minigame music
          base7(4, 'songs', 'useMinigameDates', 'availabe')

          // misc music
          base10(5)
        },
        'flash-ost'
        ,
        'flash_room',
        'flash_party',
        'music_catalogue',
        'stage_play',
        'flash_minigame',
        'flash_misc'
      ),
      pc: new MediaInfo(
        'Penguin Chat',
        () => {
          // pc misc
          base10(0)
        },
        'penguin-chat-ost',
        'penguin_chat_appearance'
      )
    }

    const getTables = async media => {
      tables = medias[media].tables
      for (let i = 0; i < tables.length; i++) {
        tables[i] = await db.handler.selectAll(tables[i])
      }
    }

    const sortInstances = () => {
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
    }

    const outputList = (dest, isSeries) => {
      const list = []
      const addedSongs = {}

      let order = 0
      instances.forEach(instance => {
        const { song } = instance
        if (!Object.keys(addedSongs).includes(song + '')) {
          order++
          const songRow = findByKey(songs, 'id', song)
          addedSongs[song] = order
          const songData = songRow.data

          const authorsList = songData.authors.map(author => {
            return findByKey(authors, 'id', author.author).data.name
          })

          const altNames = (songData.names.slice(1)).map(name => name.name)

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

          const isOfficial = Boolean(songData.names[0])
          const name = isOfficial
            ? `<span style="color: blue;">${songData.names[0].name}</span>`
            : `<span style="color: red;">${songData.unofficialNames[0].name}</span>`

          const newLine = [
            name,
            authorsList.join(', '),
            order,
            songData.link,
            instance.name,
            altNames.join(', '),
            hqSources.join(' + '),
            date
          ]

          if (isSeries) {
            const temp = newLine[4]
            newLine[4] = newLine[6]
            newLine[6] = temp
          }

          list.push(newLine)
        } else {
          const relatedIndex = isSeries ? 6 : 4
          list[addedSongs[song] - 1][relatedIndex] += `, ${instance.name}`
        }
      })

      const ost = this.generateHTML(list, isSeries)
      fs.writeFileSync(path.join(__dirname, `../views/generated/${dest}.html`), ost)
    }

    const serieInstances = []
    for (const mediaName in medias) {
      const mediaInfo = medias[mediaName]
      await getTables(mediaName)
      instances = []
      mediaInfo.updateMethod()

      // update specific one because it is included
      if (mediaList.includes(mediaName)) {
        sortInstances()
        outputList(mediaInfo.dest)
      }

      const mediaAddedSongs = {}
      instances.forEach(instance => {
        const { song } = instance
        const dateInfo = {
          date: instance.date,
          isEstimate: instance.estimate
        }
        if (!Object.keys(mediaAddedSongs).includes(song)) {
          mediaAddedSongs[song] = dateInfo
        } else {
          const dates = [
            mediaAddedSongs[song].date,
            instance.date
          ].map(date => Date.parse(date))

          if (dates[0] > dates[1]) {
            mediaAddedSongs[song] = dateInfo
          }
        }
      })

      for (const song in mediaAddedSongs) {
        serieInstances.push(new SongInstance(
          medias[mediaName].name,
          mediaAddedSongs[song],
          song
        ))
      }
    }
    instances = serieInstances

    sortInstances()
    outputList('series-ost', true)
  }

  /**
   * Creates a table HTML for a two-dimensional series list
   * @param {*[][]} matrix
   * @returns {string}
   */
  generateHTML (matrix, isSeries) {
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
            <th> Artist(s) </th>
            <th> Order </th>
            <th> Link </th>
            <th> ${isSeries ? 'HQ Source(s)' : 'Related To'} </th>
            <th> Alternate Names </th>
            <th> ${isSeries ? 'Medias' : 'HQ Source(s)'} </th>
            <th> Earliest Date </th>
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

gen.OSTListGenerator(
  'flash',
  'pc'
)

module.exports = gen
