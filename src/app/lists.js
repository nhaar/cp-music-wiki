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
    const plays = await this.db.handler.selectAll('stage_play')

    // make an index of the priorities in case it gets used
    const priorityIndex = {}
    songs.forEach(song => {
      priorityIndex[song.id] = song.data.priority
    })

    /** Array will keep all the song instances, and gets reset for each media */
    let instances = []

    /** This array will keep the rows of all the tables that are relevant for the current media */
    let tables

    const iterateUsePushInstance = (uses, callback) => {
      uses.forEach(use => {
        const args = callback(use)
        if (args) {
          instances.push(new SongInstance(...args.concat(use)))
        }
      })
    }

    const useData = (row, callback) => {
      const { data } = row
      return callback(data)
    }

    const filterUnused = (use, callback) => {
      if (!use.isUnused) return callback(use)
    }

    // iterate through every `use`, filter for unused and run a callback
    const iterateUsesNoUnused = (uses, callback) => {
      iterateUsePushInstance(uses, use => {
        return filterUnused(use, callback)
      })
    }

    const iterateData = (i, callback) => {
      tables[i].forEach(row => {
        useData(row, callback)
      })
    }

    const iterateUsesInTable = (base) => (i, key, callback) => {
      iterateData(i, data => {
        base(data[key], use => callback(use, data))
      })
    }

    const filterUsed = (use, callback) => {
      if (use.isUnused) return callback(use)
    }

    // iterate through every row of a table
    // and process its use checking for unused
    // calling a callback after
    // `i` is the index of a table
    // `key` is the property to access the `use` in the `data`
    const iterateTableNoUnused = iterateUsesInTable(iterateUsesNoUnused)

    const iterateTableUsed = iterateUsesInTable((uses, callback) => {
      iterateUsePushInstance(uses, use => {
        return filterUsed(use, callback)
      })
    })

    // gets a callback for getting a callback
    // to get the arguments for the song instance
    // using a certain key for the date
    const getKeyDateCallback = key => (use, data) => [data.name, use[key].start]

    // gets a callback for getting the arguments
    // when the date is in the key `available`
    const getAvailableDateCallback = getKeyDateCallback('available')

    const iterateUsesWithName = (namecallback) =>
      (i, key, callback) => iterateUsesInTable(iterateUsePushInstance)(i, key, (use, data) => {
        const date = callback(data, use)
        if (date) return [namecallback(data), date]
      })

    const iterateUsesWithCallback = iterateUsesWithName(data => data.name)

    const iterateTableUseParent = (i, key, useKey, dateKey) => iterateUsesWithCallback(i, key, (data, use) => {
      return filterUnused(use, () => {
        const useParent = use[useKey]
        const date = useParent
          ? data[dateKey].start
          : use.available.start
        return date
      })
    })

    const iterateUnusedWithParent = (i, key) => iterateUsesWithCallback(i, key, (data, use) => {
      return filterUsed(use, () => {
        return getComposedDate(use.song)
      })
    })

    const iterateUsedMisc = i => iterateUsesWithCallback(i, 'songs', (data, use) => {
      return filterUnused(use, () => {
        const date = use.useOwnDate
          ? use.available.start
          : data.available.start
        return date
      })
    })

    const getComposedDate = song => {
      const date = findId(songs, song).data.composedDate
      if (!date.date) date.isEstimate = true
      return date
    }

    const iterateUnusedMisc = i => iterateUsesWithCallback(i, 'songs', (data, use) => {
      return filterUsed(use, () => { return getComposedDate(use.song) })
    })

    const iterateAppearances = (i, callback) => {
      iterateUsesWithCallback(i, 'appearances', callback)
    }

    const iterateStatic = (i, callback) => {
      tables[i].data.songs.forEach(callback)
    }

    const medias = {
      flash: new MediaInfo(
        'Club Penguin (Flash)',
        () => {
          // room music
          iterateTableNoUnused(0, 'songUses', getAvailableDateCallback)

          // party music
          iterateTableUseParent(1, 'partySongs', 'usePartyDate', 'active')

          // igloo music
          iterateData(2, data => {
            data.songs.forEach(gridRow => {
              iterateUsesNoUnused(gridRow, () => ['Igloo', data.launch])
            })
          })

          // stage music
          iterateData(3, data => {
            instances.push(new SongInstance(data.name, data.appearances[0].start, data.themeSong))
          })

          // minigame music
          iterateTableUseParent(4, 'songs', 'useMinigameDates', 'available')

          // misc music
          iterateUsedMisc(5, data => data.name)
        },
        'flash-ost',
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
          iterateAppearances(0, data => ({ date: data.publishDate }))

          // tv
          iterateAppearances(1, data => data.earliest)

          // series misc
          iterateUsedMisc(2, data => data.name)
        },
        'misc-ost',
        'youtube_video',
        'tv_video',
        'series_misc'
      ),
      mobile: new MediaInfo(
        'Mobile Apps',
        () => {
          iterateTableUseParent(0, 'songUses', 'useMinigameDates', 'available')
        },
        'mobile-ost',
        'mobile_apps'
      ),
      gd: new MediaInfo(
        'Game Day',
        () => {
          const date = { date: '2010-09-16' }
          iterateStatic(0, song => {
            if (song.uses.length === 0) {
              instances.push(new SongInstance('Unknown', date, song))
            } else {
              iterateUsePushInstance(song.uses, use => {
                return [use, date, song]
              })
            }
          })
        },
        'game-day-ost',
        'game_day_ost'
      ),
      ds: new MediaInfo(
        'DS Games',
        () => {
          iterateStatic(0, song => {
            let date
            let use
            const est = false
            if (song.game === 'epf') {
              date = '2008-11-25'
              use = 'Club Penguin: Elite Penguin Force'
            } else if (song.game === 'hr') {
              date = '2010-05-25'
              use = "Club Penguin: Elite Penguin Force: Herbert's Revenge"
            }
            if (song.isUnused) {
              date = getComposedDate(song.song)
              use += ' (Unused)'
            } else {
              date = { date, isEstimate: est }
            }
            instances.push(new SongInstance(use, date, song))
          })
        },
        'ds-ost',
        'ds_ost'
      ),
      pc: new MediaInfo(
        'Penguin Chat',
        () => {
          // pc misc
          iterateUsedMisc(0, data => `${data.name} (Penguin Chat)`)

          // pc 3 misc
          iterateUsedMisc(1, data => `${data.name} (Penguin Chat 3)`)

          // pc 3 rooms
          iterateUsesWithName(data => `${data.name} (Penguin Chat 3)`)(2, 'songUses', (data, use) => use.available.start)
        },
        'penguin-chat-ost',
        'penguin_chat_misc',
        'penguin_chat_three_misc',
        'penguin_chat_three_room'
      ),
      unusedf: new MediaInfo(
        'Unused Club Penguin (Flash)',
        () => {
          // rooms
          iterateTableUsed(0, 'songUses', (use, data) => [data.name, getComposedDate(use.song)])

          // party
          iterateUnusedWithParent(1, 'partySongs')

          // stage
          iterateData(2, data => {
            const stageName = findId(plays, data.stagePlay).data.name
            instances.push(new SongInstance(stageName, getComposedDate(data.song), data.song))
          })

          // minigame
          iterateUnusedWithParent(3, 'songs')

          // misc
          iterateUnusedMisc(4)
        },
        'unused-flash-ost',
        'flash_room',
        'flash_party',
        'unused_stage',
        'flash_minigame',
        'flash_misc'
      )
    }

    /** Populate the `tables` variable with a given media */
    const getTables = async media => {
      tables = medias[media].tables
      for (let i = 0; i < tables.length; i++) {
        if (this.db.isStaticClass(tables[i])) {
          tables[i] = await this.db.getStatic(tables[i])
        } else {
          tables[i] = await this.db.handler.selectAll(tables[i])
        }
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

          if (!Object.keys(mediaAddedSongs).includes(song + '')) {
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
      'gd',
      'ds',
      'pc',
      'unusedf'
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
