import { createElement } from '../utils.js'
import {
  CheckboxModule, DateInputModule, EstimateCheckboxModule, OptionSelectModule,
  ReferenceQueryModule, SongQueryModule, TextInputModule
} from './element-modules.js'
import { ObjectChild, ObjectModule } from './main-modules.js'
import { LocalizationNameModule } from './table-modules.js'

/**
 * Module for grouping the different localization names
 */
export class LocalizationNamesModule extends ObjectModule {
  /**
   * Create element to hold the localization names
   */
  initialize () {
    this.bridge = this.e
    this.e = createElement({})
  }

  /**
   * Add language select and element
   */
  prebuild () {
    const html = `
      <option selected> [PICK LANGUAGE] </option>
      <option value="0"> Portuguese </option>
      <option value="1"> French </option>
      <option value="2"> Spanish </option>
      <option value="3"> German </option>
      <option value="4"> Russian </option>
    `
    this.selectDiv = createElement({ parent: this.bridge, className: 'language-select' })
    createElement({ parent: this.selectDiv, innerHTML: 'Language' })
    this.langSelect = createElement({ parent: this.selectDiv, tag: 'select', innerHTML: html })
    this.bridge.appendChild(this.e)
  }

  /**
   * Add control to the language select
   */
  presetup () {
    this.langSelect.addEventListener('change', () => {
      const langNamesDiv = this.e
      const targetElement = langNamesDiv.children[Number(this.langSelect.value)]
      const previousElement = langNamesDiv.querySelector(':scope > div:not(.hidden)')

      if (previousElement) previousElement.classList.add('hidden')
      if (targetElement) targetElement.classList.remove('hidden')
    })
  }

  modules () {
    return [
      new ObjectChild(LocalizationNameModule, 'pt'),
      new ObjectChild(LocalizationNameModule, 'fr'),
      new ObjectChild(LocalizationNameModule, 'es'),
      new ObjectChild(LocalizationNameModule, 'de'),
      new ObjectChild(LocalizationNameModule, 'ru')
    ]
  }
}

export class DateEstimateModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(DateInputModule, 'date'),
      new ObjectChild(EstimateCheckboxModule, 'isEstimate')
    ]
  }
}

export class TimeRangeModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(DateEstimateModule, 'start'),
      new ObjectChild(DateEstimateModule, 'end')
    ]
  }
}

/**
 * Module for the song apperances
 */
export class SongAppearanceModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(TimeRangeModule, 'available'),
      new ObjectChild(SongQueryModule, 'song'),
      new ObjectChild(ReferenceQueryModule, 'reference')
    ]
  }
}

/**
 * Module for a party song object
 */
export class PartySongModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(OptionSelectModule, 'type', {
        Room: 1,
        Minigame: 2
      }),
      new ObjectChild(CheckboxModule, 'usePartyDate'),
      new ObjectChild(TimeRangeModule, 'available'),
      new ObjectChild(SongQueryModule, 'song')
    ]
  }
}

/**
 * Module for a catalogue item object
 */
export class CatalogueItemModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(TextInputModule, 'displayName'),
      new ObjectChild(SongQueryModule, 'song')
    ]
  }
}

/**
 * Module for a stage appearance objecy
 */
export class StageAppearanceModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(TimeRangeModule, 'appearance'),
      new ObjectChild(ReferenceQueryModule, 'reference')
    ]
  }
}

/**
 * Module for a flash minigame song object
 */
export class MinigameSongModule extends ObjectModule {
  modules () {
    return [
      new ObjectChild(CheckboxModule, 'isUnused'),
      new ObjectChild(SongQueryModule, 'song'),
      new ObjectChild(CheckboxModule, 'useMinigameDates'),
      new ObjectChild(TimeRangeModule, 'available')
    ]
  }
}
