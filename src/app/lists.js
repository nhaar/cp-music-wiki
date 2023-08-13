const fs = require('fs')
const path = require('path')

/**
 * Represents the use of a song in some media at some point in history
 */
class SongInstance {
  /**
   *
   * @param {string} name - Name of whatever the song was used in
   * @param {object} dateEst - Object with data for the date
   * @param {string} dateEst.date - String representing the date
   * @param {boolean} dateEst.isEstimate - Boolean representing if the date is an estimate
   * @param {number} song - Id of the song
   */
  constructor (name, dateEst, song) {
    const properSong = typeof song === 'object' ? song.song : Number(song)
    Object.assign(this, { name, date: dateEst.date, song: properSong, estimate: dateEst.isEstimate })
  }
}

/**
 * Object to hold information for how the media are generated
 */
class MediaInfo {
  /**
   *
   * @param {string} name - The identifier name for the media
   * @param {function() : void} updateMethod - A function that updates the song instances
   * @param {string} dest - The name of the HTML file this will be created in
   * @param  {...string} tables - The name of all the tables that contain relevant data for the media
   */
  constructor (name, updateMethod, dest, ...tables) {
    Object.assign(this, { name, updateMethod, dest, tables })
  }
}

class Generator {
  /**
   * @param {WikiDatabase} db - Database to use
   */
  constructor (db) {
    this.db = db
  }

  /**
   *
   * @param  {...string} mediaList
   */
  async OSTListGenerator (...mediaList) {
    const songs = await this.db.handler.selectAll('song')
    const authors = await this.db.handler.selectAll('author')
    const sources = await this.db.handler.selectAll('source')

    // make an index of the priorities in case it gets used
    const priorityIndex = {}
    songs.forEach(song => {
      priorityIndex[song.id] = song.data.priority
    })

    /** Array will keep all the song instances, and gets reset for each media */
    let instances = []

    /** This array will keep the rows of all the tables that are relevant for the current media */
    let tables

    // iterate through every `use` which corresponds to
    // an object directly containing data for a song being used
    // and run a callback function to add the use to instances
    const base1 = (uses, callback) => {
      uses.forEach(use => {
        const args = callback(use)
        if (args) {
          instances.push(new SongInstance(...args.concat(use)))
        }
      })
    }

    // extract the data property and run a function on it
    const base2 = (row, callback) => {
      const { data } = row
      return callback(data)
    }

    // checks for `isUnused` and runs a callback
    const base3 = (use, callback) => {
      if (!use.isUnused) return callback(use)
    }

    // processes the `use` for objects that follow
    // the pattern of having a variable like "use date given by parent"
    // or "use own data"
    // `useKey` is the boolean for wheter to use parent
    // `dateKey` is the property in the parent for the date
    // assumes a structure for the use data
    const base4 = (data, use, useKey, dateKey) => {
      const useParent = use[useKey]
      const date = useParent
        ? data[dateKey].start
        : use.available.start

      return [data.name, date]
    }

    // iterate through every `use`, filter for unused and run a callback
    const base5 = (uses, callback) => {
      base1(uses, use => {
        return base3(use, callback)
      })
    }

    const base16 = (base) => (i, key, callback) => {
      tables[i].forEach(row => {
        base2(row, data => {
          base(data[key], use => callback(use, data))
        })
      })
    }

    // iterate through every row of a table
    // and process its use checking for unused
    // calling a callback after
    // `i` is the index of a table
    // `key` is the property to access the `use` in the `data`
    const base6 = base16(base5)

    // iterate through a table following the
    // "use date from parent" pattern
    const base7 = (i, key, useKey, dateKey) => {
      base6(i, key, (use, data) => base4(data, use, useKey, dateKey))
    }

    // gets a callback for getting a callback
    // to get the arguments for the song instance
    // using a certain key for the date
    const base8 = key => (use, data) => [data.name, use[key].start]

    // gets a callback for getting the arguments
    // when the date is in the key `available`
    const base9 = base8('available')

    // iterator where each row of the table is a `use` already
    const base10 = (i) => {
      base1(tables[i], use => {
        return base2(use, data => {
          return [data.name, data.available.start, data]
        })
      })
    }
    const base11 = (i, key, callback) => {
      tables[i].forEach(row => {
        base2(row, data => {
          base1(data[key], () => {
            return [data.name, callback(data)]
          })
        })
      })
    }

    const base12 = (i, callback) => {
      base11(i, 'appearances', callback)
    }

    const base13 = (i) => {
      base11(i, 'songs', date => date.available.start)
    }

    const base14 = base16(base1)

    const base15 = (i, key, useKey, dateKey) => {
      base14(i, key, (use, data) => base4(data, use, useKey, dateKey))
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
          tables[3].forEach(row => {
            base2(row, data => {
              instances.push(new SongInstance(data.name, data.appearances[0].start, data.themeSong))
            })
          })

          // minigame music
          base7(4, 'songs', 'useMinigameDates', 'available')

          // misc music
          base13(5)
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
      misc: new MediaInfo(
        'Misc',
        () => {
          // youtube
          base12(0, data => ({ date: data.publishDate }))

          // tv
          base12(1, data => data.earliest)

          // series misc
          base13(2)
        },
        'misc-ost',
        'youtube_video',
        'tv_video',
        'series_misc'
      ),
      mobile: new MediaInfo(
        'Mobile Apps',
        () => {
          base15(0, 'songUses', 'useMinigameDates', 'available')
        },
        'mobile-ost',
        'mobile_apps'
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

    /** Populate the `tables` variable with a given media */
    const getTables = async media => {
      tables = medias[media].tables
      for (let i = 0; i < tables.length; i++) {
        tables[i] = await this.db.handler.selectAll(tables[i])
      }
    }

    /** Sorts all the song instances based on their date and priority */
    const sortInstances = () => {
      instances.sort((a, b) => {
        const ab = [a, b]
        const dates = ab.map(instance => Date.parse(instance.date))

        const difference = dates[0] - dates[1] || 0
        if (difference === 0) {
          const priorities = [a, b].map(instance => priorityIndex[instance.song])
          return priorities[0] - priorities[1] || 0
        } else {
          return difference
        }
      })
    }

    /**
     * Creates the 2-dimensional array with all the data to be used in the final list
     * @param {string} dest - The name of the file
     * @param {boolean} isSeries - True if the list is for the series, false if for a media
     */
    const outputList = (dest, isSeries) => {
      /** The 2d array for the HTML table that will get created */
      const list = []

      /** Object with every song that was added
       * Maps the song ID to its order number
       */
      const addedSongs = {}

      let order = 0
      // iterating through every instance to either
      // add a new row to the `list` array or to add more information
      // to an existing row
      instances.forEach(instance => {
        const { song } = instance

        if (song) {
        // filter out instances with no song
          if (!Object.keys(addedSongs).includes(song + '')) {
            // add row if the song wasn't added yet
            order++
            const songRow = findId(songs, song)
            addedSongs[song] = order
            const songData = songRow.data

            const authorsList = songData.authors.map(author => {
              // author might not have ID if it was deleted
              const searchRes = findId(authors, author.author)
              if (searchRes) return searchRes.data.name
              else return ''
            })
            authorsList.filter(name => name)

            const altNames = (songData.names.slice(1)).map(name => name.name)

            const hqSources = []
            songData.files.forEach(file => {
              if (file.isHQ) {
                const sourceName = findId(sources, file.source).data.name

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

            const link = songData.link
              ? `<a href="${songData.link}"> Link <a>`
              : ''

            const newLine = [
              name,
              authorsList.join(', '),
              order,
              link,
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
        }
      })

      const ost = this.generateHTML(list, isSeries)
      fs.writeFileSync(path.join(__dirname, `../views/generated/${dest}.html`), ost)
    }

    /** Instances array but for the entire series */
    const serieInstances = []

    // go through every media to assemble series list
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

      // create instances for the series
      const mediaAddedSongs = {}
      instances.forEach(instance => {
        const { song } = instance
        if (song) {
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
   * Creates the table HTML for a two-dimensional series list
   * @param {any[][]} matrix - The list
   * @returns {string} - The HTML for the page
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
        <title> Club Penguin Music Wiki</title>
        <link rel="stylesheet" href="stylesheets/list.css">
      </head>

      <body>
        <table class="list-table">
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
   * Update all lists
   */
  async updateLists () {
    this.OSTListGenerator(
      'flash',
      'misc',
      'mobile',
      'pc'
    )
  }
}

/**
 * In an array of objects, find which object has the property `id` matching a value
 * @param {object[]} array - Array with the objects
 * @param {number} id - Value the `id` property needs to match
 * @returns {object | undefined} The matched object if it exists
 */
function findId (array, id) {
  for (let i = 0; i < array.length; i++) {
    if (array[i].id === id) return array[i]
  }
}

module.exports = Generator
