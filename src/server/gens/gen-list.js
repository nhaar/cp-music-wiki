const sql = require('../database/sql-handler')
const { getRandomElement } = require('../misc/server-utils')

/**
 * Object that contains methods for generating a specific page type
 * @typedef {object} PageTypeGen
 * @property {function() : string[]} getter - Method that gets the name of all the pages of this type
 * @property {async function(string) : any} parser - Method that generates data that can be used by the frontend to render the page of this type
 * @property {string} file - Name of the JavaScript JSX file that renders this page type
 */

/** Class that groups all different page generators and houses methods to handle them */
class PageGenerator {
  /**
   * Construct generator for a specific page
   * @param {string} page - Page name as is from the URL
   */
  constructor (page) {
    Object.assign(this, { page })
  }

  /** List of all the `PageTypeGen`s that exist */
  static lists = [
    require('./song-gen'),
    require('./ost-gen'),
    require('./disambig-gen')
  ]

  /**
   * Get the name of all the pages across all types
   * @returns {string[]} Array with the names
   */
  static async getAllNames () {
    const names = []
    for (let i = 0; i < PageGenerator.lists.length; i++) {
      names.push(...(await PageGenerator.lists[i].getter()))
    }
    return names
  }

  /**
   * Search across all types for pages that contain a specific expression
   * @param {string} keyword - Word or expression to search with
   * @returns {string[]} Array with pages that were found
   */
  static async searchPages (keyword) {
    return (await PageGenerator.getAllNames())
      .filter(name => name.match(new RegExp(`${keyword}`, 'i')))
  }

  /**
   * Get a random page name across all types
   * @returns {string} Page name
   */
  static async getRandomName () {
    return getRandomElement(await PageGenerator.getAllNames())
  }

  /**
   * Find the page generator that contains a page name
   * @param {string} name - Page name
   * @returns {PageTypeGen} Found generator
   */
  static async findName (name) {
    for (let i = 0; i < PageGenerator.lists.length; i++) {
      const list = PageGenerator.lists[i]
      if ((await list.getter()).includes(name)) return list
    }
  }

  /**
   * Get the parsed data for every page across all generators
   * @returns {any[]} Array with custom parsed types
   */
  static async getAllParsed () {
    const parsed = []
    for (let i = 0; i < PageGenerator.lists.length; i++) {
      const list = PageGenerator.lists[i]
      parsed.push(...await Promise.all((await list.getter()).map(name => list.parser(name))))
    }
    return parsed
  }

  /**
   * Get the category-specific id for a category (not its item id)
   * @param {string} name - Category
   * @returns {number} ID
   */
  static async getCategoryId (name) {
    const result = await sql.selectAndEquals('items', 'cls, querywords', ['category', name])
    return result.length && result[0].predefined
  }

  /**
   * Get the parsed data for rendering the page from this instance
   * @returns {any | undefined} Parsed data for rendering the page or `undefined` if the page does not exist
   */
  async parse () {
    this.gen = await PageGenerator.findName(PageGenerator.convertUrlToName(this.page))
    if (!this.gen) return
    const data = await this.gen.parser(this.page)
    const categoryNames = []
    for (let i = 0; i < data.categories.length; i++) {
      categoryNames.push((await sql.selectAndEquals(
        'items', 'cls, predefined', ['category', data.categories[i]]
      ))[0].querywords)
    }
    data.categoryNames = categoryNames
    return data
  }

  /**
   * Get all the pages that contain a category
   * @param {string} category - Category name
   * @returns {string[]} Array with page names
   */
  static async getPagesInCategory (category) {
    return (await PageGenerator.getAllParsed())
      .filter(page => page.categories.includes(PageGenerator.getCategoryId(category))).map(page => page.name)
  }

  /**
   * Convert a string extracted from an URL that represents a page into a valid page name
   * @param {string} value - Extracted URL
   * @returns {string} Valid page name
   */
  static convertUrlToName (value) {
    return value.replace(/_/g, ' ')
  }
}

module.exports = PageGenerator
