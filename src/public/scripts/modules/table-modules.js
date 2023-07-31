import { createElement } from '../utils.js'
import { ReferenceQueryModule, TextAreaModule, TextInputModule, getSearchQueryModule } from './element-modules.js'
import { TableChild, TableModule } from './main-modules.js'
import { LocalizationNamesModule } from './object-modules.js'

/**
 * Module for editting the data for a localization name
 */
export class LocalizationNameModule extends TableModule {
  /**
   * Create internal pointer
   */
  initialize () {
    this.e = createElement({ parent: this.e })
  }

  style () { return ['hidden', 'localization-name', 'header-row'] }

  modules () {
    return [
      new TableChild('Localized Name', TextInputModule, 'name'),
      new TableChild('Name Reference', ReferenceQueryModule, 'reference'),
      new TableChild('Translation Notes', TextAreaModule, 'translationNotes')
    ]
  }
}

/**
 * Module for editting a song name (official)
 */
export class SongNameModule extends TableModule {
  modules () {
    return [
      new TableChild('Main Name', TextInputModule, 'name'),
      new TableChild('Name Reference', ReferenceQueryModule, 'reference'),
      new TableChild('Localization Name', LocalizationNamesModule, '')
    ]
  }
}

/**
 * Module for editting a song author
 */
export class SongAuthorModule extends TableModule {
  modules () {
    return [
      new TableChild('Author Name', getSearchQueryModule('author'), 'author'),
      new TableChild('Reference', ReferenceQueryModule, 'reference')
    ]
  }
}

/**
 * Module for an unofficial name
 */
export class UnofficialNameModule extends TableModule {
  modules () {
    return [
      new TableChild('Name', TextInputModule, 'name'),
      new TableChild('Description', TextAreaModule, 'description')
    ]
  }
}

/**
 * Module for a song version object
 */
export class SongVersionModule extends TableModule {
  modules () {
    return [
      new TableChild('Version Name', TextInputModule, 'name'),
      new TableChild('Description', TextAreaModule, 'description')
    ]
  }
}
