const clsys = require('../database/class-system')
const { forEachAsync, findId } = require('../misc/server-utils')

/**
 * Object with important data for medias
 * @typedef {object} MediaInfo
 * @property {string} id - Short name identifying a media
 * @property {OptionsSheet[]} sheets - All sheets for finding instances
 * @property {string} mediaName - Display name in the series list for this media
 */

/** Class represents the use of a song in some media at some point in history, which are called instances */
class SongInstance {
  /**
   * Save the instance properties
   * @param {string} name - Name of whatever the song was used in, as it will be displayed in the final list
   * @param {object} dateEst - Object with data for the date of use
   * @param {string} dateEst.date - String representing the date
   * @param {boolean} dateEst.isEstimate - `true` if the date is an estimate, `false` if it is an exact date for the use
   * @param {string | number} song - Item id of the song in either number or string representation
   */
  constructor (name, dateEst, song) {
    Object.assign(this, { name })
    if (song) this.addSong(song)
    if (dateEst) this.addDate(dateEst)
  }

  /**
   * Validate and save the song property
   * @param {string | number} song - Item id of the song in either number or string representation
   */
  addSong (song) {
    this.song = Number(song)
  }

  /**
   * Save the date properties
   * @param {object} dateEst - Object with data for the date of use
   * @param {string} dateEst.date - String representing the date
   * @param {boolean} dateEst.isEstimate - `true` if the date is an estimate, `false` if it is an exact date for the use
   */
  addDate (dateEst) {
    this.date = dateEst.date
    this.estimate = dateEst.isEstimate
  }
}

/**
 * Objects of this class contain properties that are processed by the 'MediaGenerator' to process song instances
 *
 * Below is a list of all the properties read by the generator. If they don't apply to the specific use case,
 * they can be left out and the generator will understand
 *
 * The words `row`, `data` and `use` in this context refer to how they operate inside `MediaGenerator.iterateInstances`,
 * where `row` is the target of `rowAction`, `data` is a property inside `row` that contains an object,
 * and `use` is the target of `useAction`
 *
 * The words `name`, `song` and `date` refer to how they are used inside `SongInstance`
 *
 * @property {string} cls - Name of class that stores the instances
 * @property {string} usesProp - Property in `data` with an array of `uses`s
 * @property {boolean} is2dUses - `true` if the `use`s array is a two dimensional array, `false` otherwise
 * @property {boolean} usedOnly - `true` if only `use`s with the `isUnused` property set to `false` should be used, `false` otherwise
 * @property {string} dataNameProp - Property in `data` that contains `name`
 * @property {string} useSongProp - Property inside `use` that contains `song`
 * @property {string} dataSongProp - Property inside `data` that contains `song`
 * @property {string} useRangeProp - Property inside `use` that contains a date range
 * @property {string} useDateProp - Property inside `use`s that contains `date`
 * @property {string} dateOriginProp - Property inside `use`s that decides whether `date` comes from `row` or from `use`
 * @property {string} rowRangeProp - Property inside `data` that contains a date range
 * @property {string} rowDateProp - Property inside `data` that contains `date`
 * @property {string} predefinedName - Predefined `name` for all instances
 * @property {boolean} invertOriginBool - `true` if the property in `dateOriginProp` should represents using the `data` property if it is `false`, `true` for the other way around
 */
class OptionsSheet {
  /**
   * Store class and given options
   * @param {string} className - A string with all the option sheet class names used, see `parseClasses` for more info
   * @param {OptionsSheet} options - Object with all the properties to pass to the sheet
   */
  constructor (className, options = {}) {
    this.parseClasses(className)
    Object.assign(this, { ...options })
  }

  /**
   * Parse all the option classes
   *
   * Classes are a shorthand way to define properties with a single string
   *
   * Their syntax is the same as CSS classes, their definitions can be found in the `switch` statement within
   * this method
   * @param {string} className - A string with all classes to be added to the sheet, with space betwen the classes, for using no `className` give `undefined` or an empty string
   */
  parseClasses (className) {
    if ([undefined, ''].includes(className)) return
    className.match(/[\w-]+/g).forEach(name => {
      switch (name) {
        case 'standard': {
          this.parseClasses('data-name use-song range-available start-date')
          break
        }
        case 'standard-used': {
          this.parseClasses('used-only standard')
          break
        }
        case 'standard-used-multi': {
          this.parseClasses('standard-used standard-data-date')
          break
        }
        case 'standard-data-date': {
          this.parseClasses('data-range data-date')
          break
        }
        case 'used-only': {
          this.usedOnly = true
          break
        }
        case 'data-name': {
          this.dataNameProp = 'name'
          break
        }
        case 'use-song': {
          this.useSongProp = 'song'
          break
        }
        case 'range-available': {
          this.useRangeProp = 'available'
          break
        }
        case 'start-date': {
          this.useDateProp = 'start'
          break
        }
        case 'data-range': {
          this.rowRangeProp = 'available'
          break
        }
        case 'data-date': {
          this.rowDateProp = 'start'
          break
        }
        default: {
          throw new Error(`Unknown class name "${name}". Did you commit a typo?`)
        }
      }
    })
  }
}

/** Class that handles the types of medias and how to generate them */
class MediaGenerator {
  /** Determine output media from the page name */
  constructor (page) {
    this.media = MediaGenerator.medias[page].id
    this.isSeries = this.media === 'series'
    Object.assign(this, { page })
  }

  /**
   * Get all the OST list page names
   * @returns {string[]} Array with all the page names
   */
  static getPages () {
    return Object.keys(MediaGenerator.medias)
  }

  /**
   * Get the output for the `parser` method of the generator inside the generator lists
   * @returns {object} Object following the specifications of the page renderer
   */
  async parse () {
    return {
      rows: await this.createRows(),
      isSeries: this.isSeries,
      categories: [1],
      name: this.page
    }
  }

  /**
   * Object that maps the name of pages to a `MediaInfo` object for the respective media
   * @type {Object.<string, MediaInfo>}
   */
  static medias = {
    'Series OST': {
      id: 'series'
    },
    'Club Penguin OST': {
      id: 'flash',
      sheets: [
        new OptionsSheet('standard-used', {
          cls: 'flash_room',
          usesProp: 'songUses'
        }),
        new OptionsSheet('standard-used', {
          cls: 'flash_party',
          usesProp: 'partySongs',
          dateOriginProp: 'usePartyDate',
          rowRangeProp: 'active',
          rowDateProp: 'start'
        }),
        new OptionsSheet('use-song', {
          cls: 'music_catalogue',
          predefinedName: 'Igloo',
          usesProp: 'songs',
          is2dUses: true,
          rowDateProp: 'launch'
        }),
        new OptionsSheet('data-name start-date', {
          cls: 'stage_play',
          usesProp: 'appearances',
          useDateProp: 'start',
          dataSongProp: 'themeSong'
        }),
        new OptionsSheet('standard-used-multi', {
          cls: 'flash_minigame',
          dateOriginProp: 'useMinigameDates'
        }),
        new OptionsSheet('standard-used-multi', {
          cls: 'flash_misc',
          dateOriginProp: 'useOwnDate',
          invertOriginBool: true
        })
      ],
      mediaName: 'Club Penguin'
    },
    'Club Penguin Island OST': {
      id: 'cpi',
      sheets: [
        new OptionsSheet('standard', {
          cls: 'cpi_screen',
          usesProp: 'songUses'
        })
      ],
      mediaName: 'Club Penguin Island'
    }
  }

  /** Array will keep all the song instances, and gets reset for each media in the case of the series list */
  instances = []

  /** Save all general purpose data required to create the rows */
  async dataFetcher () {
    // general data
    this.songs = await clsys.selectAllInClass('song')
    this.authors = await clsys.selectAllInClass('author')
    this.sources = await clsys.selectAllInClass('source')

    // specialized data
    if (this.media === 'unusedf') this.plays = await clsys.selectAllInClass('stage_play')
  }

  /** Create a map of the priorities of each song for a simpler execution */
  createPrioryIndex () {
    /** Map that takes a song's item id to its priority value */
    this.priorityIndex = {}
    this.songs.forEach(song => {
      this.priorityIndex[song.id] = song.data.priority
    })
  }

  /** Create the two-dimensional array representation of the data that composes the list, that will be used to render it */
  async createRows () {
    await this.dataFetcher()
    this.createPrioryIndex()

    return this.media === 'series'
      ? (await this.getSeriesRows())
      : (await this.getMediaRows())
  }

  /**
   * Get the `MediaInfo` object for a media using the media identifier
   * @param {string} id - String identifier
   * @returns {MediaInfo} Media info
   */
  getMediaInfo (id) {
    for (const page in MediaGenerator.medias) {
      const info = MediaGenerator.medias[page]
      if (info.id === id) return info
    }
  }

  /** Update `instances` with all of the instances from a media */
  async getMediaInstances (media) {
    await forEachAsync(this.getMediaInfo(media).sheets, async sheet => {
      await this.iterateInstances(sheet)
    })
  }

  /** Get the array of list rows for for a specific media */
  async getMediaRows () {
    await this.getMediaInstances(this.media)
    this.sortInstances()
    return this.outputList()
  }

  /** Get the array of list rows for the series list */
  async getSeriesRows () {
    /** Similar as the `instances` property, but will be used to save all instances from all medias into one */
    const serieInstances = []

    // go through every media to assemble the list
    for (const page in MediaGenerator.medias) {
      const mediaInfo = MediaGenerator.medias[page]

      // series must be skipped
      if (mediaInfo.id === 'series') continue

      this.instances = []
      await this.getMediaInstances(mediaInfo.id)

      // create series instances based on the current media
      // store the info for every song in this media to later add to series instances
      const mediaAddedSongs = {}
      this.instances.forEach(instance => {
        if (instance.song) {
          const dateInfo = {
            date: instance.date,
            isEstimate: instance.estimate
          }

          if (!Object.keys(mediaAddedSongs).includes(instance.song + '')) {
            mediaAddedSongs[instance.song] = dateInfo
          } else {
            // decide whether should use this instance date or not (pick oldest)
            const dates = [
              mediaAddedSongs[instance.song].date,
              instance.date
            ].map(date => Date.parse(date))

            if (dates[0] > dates[1]) {
              mediaAddedSongs[instance.song] = dateInfo
            }
          }
        }
      })

      for (const song in mediaAddedSongs) {
        serieInstances.push(new SongInstance(
          mediaInfo.mediaName,
          mediaAddedSongs[song],
          song
        ))
      }
    }

    this.instances = serieInstances

    this.sortInstances()
    return this.outputList()
  }

  /**
   * Iterate through all rows of a class to find its song instances
   * @param {OptionsSheet} options - Object with the option properties that define what each iteration will do
   */
  async iterateInstances (options) {
    const rows = await clsys.selectAllInClass(options.cls)

    // this function is the last to be called on each iteration and acts on an object said to be a `use`
    // because it contains song instance specific information and adds this information
    // to `instances` at the end of the execution
    const useAction = (use, row) => {
      const instance = new SongInstance()
      // filtering
      if (options.usedOnly && use.isUnused) return

      // `name` property
      if (options.dataNameProp) instance.name = row.data[options.dataNameProp]
      if (options.predefinedName) instance.name = options.predefinedName

      // `song` property
      if (options.dataSongProp) instance.addSong(row.data[options.dataSongProp])
      if (options.useSongProp) instance.addSong(use[options.useSongProp])

      // `date` property
      /** Variable will be`true` if not using the boolean to decide where date comes from, `false if using */
      const noOriginBool = Boolean(!options.dateOriginProp)
      // convert values into boolean
      const dateOriginBool = Boolean(use[options.dateOriginProp])
      const invertOriginBool = Boolean(options.invertOriginBool)

      let date
      // check the definitions of `dateOriginProp` and `invertOriginBool` to understand the expressions in the statements
      if (noOriginBool || dateOriginBool === !invertOriginBool) {
        if (options.rowRangeProp || options.rowDateProp) date = row.data
        if (options.rowRangeProp) date = date[options.rowRangeProp]
        if (options.rowDateProp) date = date[options.rowDateProp]
      }
      if (noOriginBool || dateOriginBool === invertOriginBool) {
        if (!date) date = use
        if (options.useRangeProp) date = date[options.useRangeProp]
        if (options.useDateProp) date = date[options.useDateProp]
      }
      instance.addDate(date)

      this.instances.push(instance)
    }

    // this function is called for each row found in the class
    const rowAction = row => {
      // iterating through array of uses
      if (options.usesProp) {
        row.data[options.usesProp].forEach(use => {
          if (options.is2dUses) {
            use.forEach(use2 => useAction(use2, row))
          } else useAction(use, row)
        })
      }
    }

    rows.forEach(rowAction)
  }

  /** Sort all the instances in `instances` by date, from oldest to newest */
  sortInstances () {
    this.instances.sort((a, b) => {
      const ab = [a, b]
      if (!a.date) return 1
      else if (!b.date) return -1

      const dates = ab.map(instance => Date.parse(instance.date))
      const difference = dates[0] - dates[1] || 0

      // priorities are used as a tie-breaker
      if (difference === 0) {
        const priorities = ab.map(instance => this.priorityIndex[instance.song])
        return priorities[0] - priorities[1] || 0
      } else return difference
    })
  }

  /** Process the `instances` into the two dimensional array that will be sent to the OST generator */
  outputList () {
    /** Row array to output */
    const list = []

    /**
     * Object with every song that was added
     *
     * Maps the song ID to its order number
     */
    const addedSongs = {}

    let order = 0
    // iterating through every instance to either
    // add a new row to the `list` array or to add more information
    // to an existing row
    this.instances.forEach(instance => {
      // filter out instances with no song
      if (instance.song) {
        if (!Object.keys(addedSongs).includes(instance.song + '')) {
          // add row if the song wasn't added yet
          order++
          const songRow = findId(this.songs, instance.song)
          addedSongs[instance.song] = order
          const songData = songRow.data

          // get the list of all author names for the song
          const authorsList = songData.authors.map(author => {
            return findId(this.authors, author.author).data.name
          })

          // get all names that aren't first one
          const altNames = (songData.names.slice(1)).map(name => name.name)

          // save all HQ sources
          const hqSources = []
          songData.files.forEach(file => {
            if (file.isHQ) {
              const sourceName = findId(this.sources, file.source).data.name

              hqSources.push(sourceName)
            }
          })

          // earliest date
          const date = instance.estimate
            ? 'est'
            : instance.date

          // main name
          const officialName = songData.names[0]
          const name = officialName
            ? [officialName.name, true]
            : [songData.unofficialNames[0].name, false]

          // yt link
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
          list[addedSongs[instance.song] - 1].related += `, ${instance.name}`
        }
      }
    })

    return list
  }
}

module.exports = {
  getter () {
    return MediaGenerator.getPages()
  },
  async parser (value) {
    const creator = new MediaGenerator(value)
    return await creator.parse()
  },
  file: 'OstGen'
}
