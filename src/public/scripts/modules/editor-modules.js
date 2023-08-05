import { GridModule, MoveableRowsModule } from './array-modules.js'
import {
  CategoryQueryModule, CheckboxModule, DateInputModule, FileUploadModule,
  NumberInputModule, ReferenceQueryModule, SongQueryModule, SourceQueryModule,
  TextAreaModule, TextInputModule, getSearchQueryModule
} from './element-modules.js'
import { EditorModule, ObjectChild, ObjectModule, TableChild } from './main-modules.js'
import {
  CatalogueItemModule, DateEstimateModule, MinigameSongModule, PartySongModule,
  SongAppearanceModule, StageAppearanceModule, TimeRangeModule
} from './object-modules.js'
import { AudioFileModule } from './readonly-modules.js'
import { SongAuthorModule, SongNameModule, SongVersionModule, UnofficialNameModule } from './table-modules.js'

/**
 * Class for an editor that contains a single module which is a text input
 * and only updates the name property inside the data object
 */
export class NameOnlyEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Name', TextInputModule, 'name')
    ]
  }
}

export class SongFileEditor extends ObjectModule {
  modules () {
    const lastClass = this.out.read().originalname
      ? AudioFileModule
      : FileUploadModule

    return [
      new ObjectChild(SourceQueryModule, 'source'),
      new ObjectChild(TextInputModule, 'link'),
      new ObjectChild(CheckboxModule, 'isHQ'),
      new ObjectChild(lastClass, '')
    ]
  }
}

/**
 * Module for the song editor
 */
export class SongEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Names', MoveableRowsModule, 'names', SongNameModule, 'name-div'),
      new TableChild('Authors', MoveableRowsModule, 'authors', SongAuthorModule, 'authors-div'),
      new TableChild('Youtube Link', TextInputModule, 'link'),
      new TableChild('Song Files', MoveableRowsModule, 'files', SongFileEditor, 'audios-div'),
      new TableChild('Unofficial Names', MoveableRowsModule, 'unofficialNames', UnofficialNameModule),
      new TableChild('SWF Music IDs', MoveableRowsModule, 'swfMusicNumbers', NumberInputModule),
      new TableChild('First Paragraph', TextAreaModule, 'firstParagraph'),
      new TableChild('Page Source Code', TextAreaModule, 'page'),
      new TableChild('Key Signatures', MoveableRowsModule, 'keySignatures', getSearchQueryModule('key_signature')),
      new TableChild('Musical Genres', MoveableRowsModule, 'genres', getSearchQueryModule('genre')),
      new TableChild('Page Categories', MoveableRowsModule, 'categories', CategoryQueryModule),
      new TableChild('Song Versions', MoveableRowsModule, 'versions', SongVersionModule),
      new TableChild('Date Composed', DateEstimateModule, 'composedDate'),
      new TableChild('External Release Date', DateInputModule, 'externalReleaseDate'),
      new TableChild('Priorty Number', NumberInputModule, 'priority')
    ]
  }
}

/**
 * Module for the reference editor
 */
export class ReferenceEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Reference Name', TextInputModule, 'name'),
      new TableChild('Link to Reference (if needed)', TextInputModule, 'link'),
      new TableChild('Reference Description', TextAreaModule, 'description')
    ]
  }
}

/**
 * Module for the file editor
 */
export class FileEditor extends EditorModule {
  modules () {
    const id = this.r.file.id
    let FileClass
    let fileHeader
    if (id) {
      FileClass = AudioFileModule
      fileHeader = 'Audio Preview'
    } else {
      FileClass = FileUploadModule
      fileHeader = 'Upload the audio file'
    }
    return [
      new TableChild('File Song', SongQueryModule, 'song'),
      new TableChild('File Source', SourceQueryModule, 'source'),
      new TableChild('Link to Source (if needed)', TextInputModule, 'link'),
      new TableChild('Is it HQ?', CheckboxModule, 'isHQ'),
      new TableChild(fileHeader, FileClass, '')
    ]
  }
}

/**
 * Module for the musical genre editor
 */
export class GenreEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Genre Name', TextInputModule, 'name'),
      new TableChild('External Link', TextInputModule, 'link')
    ]
  }
}

/**
 * Module for the musical instrument editor
 */
export class InstrumentEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Instrument Name', TextInputModule, 'name'),
      new TableChild('External Link', TextInputModule, 'link')
    ]
  }
}

/**
 * Module for the key signature editor
 */
export class KeysigEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Key Signature Name', TextInputModule, 'name'),
      new TableChild('External Link', TextInputModule, 'link')
    ]
  }
}

/**
 * Module for the wiki page editor
 */
export class PageEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Page Title', TextInputModule, 'name'),
      new TableChild('Content', TextAreaModule, 'content'),
      new TableChild('Categories', MoveableRowsModule, 'categories', CategoryQueryModule)
    ]
  }
}

/**
 * Module for the flash room editor
 */
export class FlashroomEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Room Name', TextInputModule, 'name'),
      new TableChild('Time period the room was open', TimeRangeModule, 'open'),
      new TableChild('Songs uses in the room', MoveableRowsModule, 'songUses', SongAppearanceModule)
    ]
  }
}

/**
 * Module for the flash party editor
 */
export class FlashpartyEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Party Name', TextInputModule, 'name'),
      new TableChild('Period the party was actiuve', TimeRangeModule, 'active'),
      new TableChild('Songs used in the party', MoveableRowsModule, 'partySongs', PartySongModule)
    ]
  }
}

/**
 * Module for the music catalogue editor
 */
export class MuscatalogEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Catalogue Title', TextInputModule, 'name'),
      new TableChild('Catalogue Notes', TextAreaModule, 'description'),
      new TableChild('Catalogue Date', DateEstimateModule, 'launch'),
      new TableChild('Song List', GridModule, 'songs', CatalogueItemModule),
      new TableChild('Catalogue Reference', ReferenceQueryModule, 'reference')
    ]
  }
}

/**
 * Module for the stage play editor
 */
export class StageEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Stage Play Name', TextInputModule, 'name'),
      new TableChild('Play Theme Song', SongQueryModule, 'song'),
      new TableChild('Play Debuts', MoveableRowsModule, 'appearances', StageAppearanceModule)
    ]
  }
}

/**
 * Module for the flash minigame editor
 */
export class FlashgameEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Minigame Name', TextInputModule, 'name'),
      new TableChild('Time period game is playable', TimeRangeModule, 'available'),
      new TableChild('Minigame songs', MoveableRowsModule, 'songs', MinigameSongModule)
    ]
  }
}

/**
 * Module for the EPF OST editor
 */
export class EPFEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Songs', MoveableRowsModule, 'songs', SongQueryModule)
    ]
  }
}
// name QUERY
// description TEXT
// song INT
// available TIME_RANGE
export class PCAppearanceEditor extends EditorModule {
  modules () {
    return [
      new TableChild('Name', TextInputModule, 'name'),
      new TableChild('Description', TextAreaModule, 'description'),
      new TableChild('Song', SongQueryModule, 'song'),
      new TableChild('Available Period', TimeRangeModule, 'available')
    ]
  }
}

function buildEditor (code) {
  const lines = code.split('\n').map(line => line.trim()).filter(line => Boolean(line))
  const moduleList = []

  lines.forEach(line => {
    const property = line.match(/\w+/)[0]
    const type = line.match(/(?<=\w+\s+)(?:{)?\w+(?:})?(\[\])*/)[0]
    const rest = line.match(/(?<=(?<=\w+\s+)(?:{)?\w+(?:})?(\[\])*\s+).*/)
    let params = []
    if (rest) params = rest[0].match(/\S+/g)

    let headerName = 'PLACEHOLDER'
    params.forEach(param => {
      if (param.includes('"')) headerName = param.match(/(?<=").*(?=")/)[0]
    })
    let moduleType
    switch (type) {
      case 'TEXTSHORT': {
        moduleType = TextInputModule
        break
      }
      case 'TEXTLONG': {
        moduleType = TextAreaModule
        break
      }
    }
    moduleList.push(new TableChild(headerName, moduleType, property))
  })

  class Editor extends EditorModule {
    modules () {
      return moduleList
    }
  }

  return Editor
}

export function constructEditorModule (editorData) {
  return buildEditor(editorData.main)
}
