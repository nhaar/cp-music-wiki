const fs = require('fs')
const path = require('path')

const db = require('./database')
const { youtubify } = require('./utils')

class Generator {
  /**
   *
   * @param {WikiDatabase} db
   */
  constructor (db) {
    this.db = db
  }

  /**
   * Generates a two-dimensional array representing the list
   * @returns
   */
  async generateSeriesList () {
    const rows = []

    const songs = await this.db.getAll('songs')
    const names = await this.db.getAll('song_names')
    const songNames = this.organizeBySongId(names, 'name_text')

    const authors = await this.db.getAll('authors')
    const songAuthor = await this.db.getAll('song_author')
    const authorNames = this.getIdToNameMap(authors, 'author_id')
    const songAuthors = this.organizeBySongId(songAuthor, 'author_id')

    const collections = await this.db.getAll('collections')
    const collectionNames = this.getIdToNameMap(collections, 'collection_id')

    const files = await this.db.getAll('files')
    const songFiles = this.organizeBySongId(files)

    const medias = await this.db.getAll('medias')
    const mediaNames = this.getIdToNameMap(medias, 'media_id')
    const songFeature = await this.db.getAll('song_feature')
    const songFeatureBySong = this.organizeBySongId(songFeature, 'media_id')
    const features = await this.db.getAll('features')
    const featureInfo = this.getIdToNameMap(features, 'feature_id', true)
    const featureBySong = this.organizeBySongId(songFeature)

    songs.forEach(song => {
      const songId = song.song_id
      // get name
      const name = songNames[songId][0]

      // get authors
      const authorArray = []
      const authorIds = songAuthors[songId] || []
      authorIds.forEach(author => {
        authorArray.push(authorNames[author])
      })
      const authors = this.arrayToCommaSeparated(authorArray)

      // link
      const link = youtubify(song.link)

      // hq sources
      const filesUsed = songFiles[songId] || []
      const sourceIds = []
      filesUsed.forEach(file => {
        if (file.is_hq) {
          const source = file.collection_id
          if (!sourceIds.includes(source)) sourceIds.push(source)
        }
      })
      const sourceArray = sourceIds.map(id => collectionNames[id])
      const sources = this.arrayToCommaSeparated(sourceArray)

      // alternate names
      const alternateArray = songNames[songId]
      alternateArray.splice(0, 1)
      const altNames = this.arrayToCommaSeparated(alternateArray)

      // medias
      let medias = [...new Set(songFeatureBySong[songId])]
      medias = medias.map(id => mediaNames[id])
      medias = this.arrayToCommaSeparated(medias)

      // earliest date
      const features = featureBySong[songId]
      features.forEach(feature => {
        if (feature.use_release_date) {
          feature.date = featureInfo[feature.feature_id].release_date
          feature.is_date_estimate = featureInfo[feature.feature_id].is_date_estimate
        }
      })
      features.sort((a, b) => {
        const aDate = Date.parse(a.date)
        const bDate = Date.parse(b.date)
        return aDate - bDate
      })

      const earliestDate = features[0].is_date_estimate ? '?' : features[0].date

      rows.push([name, authors, link, sources, altNames, medias, earliestDate, Date.parse(features[0].date)])
    })

    rows.sort((a, b) => a[7] - b[7])
    const finalRows = []
    rows.forEach((row, i) => {
      const dateless = row.splice(0, 7)
      dateless.splice(2, 0, i + 1)
      finalRows.push(dateless)
    })

    return finalRows
  }

  /**
   * Gives an object mapping id -> name/the whole row
   * @param {Row[]} array
   * @param {string} idName - Name of the id column
   * @param {boolean} useElement If true, uses whole row instead of name
   * @returns {object}
   */
  getIdToNameMap (array, idName, useElement) {
    const map = {}

    array.forEach(element => {
      if (!useElement) map[element[idName]] = element.name
      else map[element[idName]] = element
    })

    return map
  }

  /**
   * Creates an object where each key is a song id, and the value is an array of all values in a certain column from a table that contain the song id
   *
   * Eg, song id -> list of author ids
   * @param {Row[]} array - All rows of the table to organize
   * @param {string} column - Name of the column to target (in the example it would be author_id)
   * @returns {object}
   */
  organizeBySongId (array, column) {
    const map = {}

    array.forEach(element => {
      if (!map[element.song_id]) map[element.song_id] = []
      if (column) map[element.song_id].push(element[column])
      else map[element.song_id].push(element)
    })

    return map
  }

  /**
   * Converts an array into a "comma list" (not a csv, meant for readability)
   * @param {object} array
   * @returns {string}
   */
  arrayToCommaSeparated (array) {
    let string = ''
    let isFirst = true
    array.forEach(element => {
      if (isFirst) isFirst = false
      else string += ', '

      string += element
    })

    return string
  }

  /**
   * Creates a CSV from a two-dimensional array
   * @param {*[][]} matrix
   * @returns
   */
  generateCSV (matrix) {
    let csv = ''
    for (const row of matrix) {
      for (let i = 0; i < row.length; i++) {
        let value = row[i]
        if (typeof value === 'string') {
          // check if contains a comma or double quote
          if (value.includes(',') || value.includes('"')) {
            // escape them
            value = '"' + value.replace(/"/g, '""') + '"'
          }
        }
        csv += value
        // add comma if not the last column
        if (i < row.length - 1) {
          csv += ','
        }
      }
      // end of row
      csv += '\n'
    }
    return csv
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
            <th> HQ Source(s) </th>
            <th> Alternate Names </th>
            <th> Medias </th>
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
    const list = await this.generateSeriesList()
    const seriesHTML = await this.generateHTML(list)
    const seriesCSV = await this.generateCSV(list)
    this.db.pushListUpdate(0, seriesCSV)
    fs.writeFileSync(path.join(__dirname, '../views/generated/series-list.html'), seriesHTML)
  }
}

const gen = new Generator(db)

module.exports = gen
