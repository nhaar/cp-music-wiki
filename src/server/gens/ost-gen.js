const clsys = require('../database/class-system')

const medias = {
  'Series OST': 'series',
  'Club Penguin OST': 'flash'
}

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

async function generateOSTList (media) {
  const songs = await clsys.selectAllInClass('song')
  const authors = await clsys.selectAllInClass('author')
  const sources = await clsys.selectAllInClass('source')
  const plays = await clsys.selectAllInClass('stage_play')

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
    cpi: new MediaInfo(
      'Club Penguin Island',
      () => {
        // screens
        iterateUsesInTable(iterateUsePushInstance)(0, 'songUses', (use, data) => {
          return [data.name, use.available.start]
        })

        // locations
        iterateData(1, data => {
          data.areas.forEach(area => {
            const name = data.name
            iterateUsePushInstance(area.songUses, use => {
              const areaName = area.name
              const finalName = areaName
                ? `${name} - ${areaName}`
                : name
              return [finalName, use.available.start]
            })
          })
        })

        // quests
        iterateUsesInTable(iterateUsePushInstance)(2, 'questSongs', (use, data) => {
          return [`${data.character} Quest`, data.releaseDate]
        })

        // party
        iterateUsesInTable(iterateUsePushInstance)(3, 'songs', (use, data) => {
          return [data.name, data.active.start]
        })

        // minigame
        iterateData(4, data => {
          instances.push(new SongInstance(data.name, data.releaseDate, data.song))
        })
      },
      'cpi-ost',
      'cpi_screen',
      'cpi_location',
      'cpi_quest',
      'cpi_party',
      'cpi_minigame'
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
      const isStatic = clsys.isStaticClass(tables[i])
      tables[i] = await clsys.selectAllInClass(tables[i])
      if (isStatic) tables[i] = tables[i][0]
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
  const outputList = (isSeries) => {
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
            ? 'est'
            : instance.date

          const isOfficial = Boolean(songData.names[0])
          const name = isOfficial
            ? [songData.names[0].name, true]
            : [songData.unofficialNames[0].name, false]

          const link = songData.link

          const newLine = {
            nameInfo: name,
            authors: authorsList,
            order,
            link,
            related: instance.name,
            sources: hqSources,
            date,
            altNames
          }

          list.push(newLine)
        } else {
          const relatedIndex = isSeries ? 6 : 4
          list[addedSongs[song] - 1][relatedIndex] += `, ${instance.name}`
        }
      }
    })

    return list
  }

  async function getMediaInstances (media) {
    await getTables(media)
    instances = []
    medias[media].updateMethod()
  }

  async function getMediaOutput (media) {
    await getMediaInstances(media)
    sortInstances()
    return outputList()
  }

  async function getSeriesOutput () {
    /** Instances array but for the entire series */
    const serieInstances = []

    // go through every media to assemble series list
    for (const mediaName in medias) {
      await getMediaInstances(mediaName)

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
    return outputList(true)
  }

  return media === 'series'
    ? (await getSeriesOutput())
    : (await getMediaOutput(media))
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

module.exports = {
  getter () {
    return Object.keys(medias)
  },
  async parser (value) {
    const name = medias[value]
    return {
      rows: await generateOSTList(name),
      isSeries: name === 'series',
      categories: [1],
      name: value
    }
  },
  file: 'OstGen'
}
