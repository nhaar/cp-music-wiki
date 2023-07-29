import { FileEditor, FlashgameEditor, FlashpartyEditor, FlashroomEditor, GenreEditor, InstrumentEditor, KeysigEditor, MuscatalogEditor, PageEditor, ReferenceEditor, SongEditor, StageEditor, getNameOnlyEditor } from './editor-modules.js'

class TypeInfo {
  constructor (type, name, editor, input = {}) {
    Object.assign(this, { type, name, Editor: editor, input })
  }
}

export const types = [
  new TypeInfo(
    'song',
    'Song',
    SongEditor,
    {
      file: `
        SELECT file
        WHERE data ->> 'song' = '$id'
      `
    }
  ),
  new TypeInfo(
    'author',
    'Author',
    getNameOnlyEditor('author')
  ),
  new TypeInfo(
    'source',
    'Source',
    getNameOnlyEditor('source')
  ),
  new TypeInfo(
    'file',
    'File',
    FileEditor
  ),
  new TypeInfo(
    'wiki_reference',
    'Reference',
    ReferenceEditor
  ),
  new TypeInfo(
    'genre',
    'Music Genre',
    GenreEditor
  ),
  new TypeInfo(
    'instrument',
    'Music Instrument',
    InstrumentEditor
  ),
  new TypeInfo(
    'key_signature',
    'Key Signature',
    KeysigEditor
  ),
  new TypeInfo(
    'page',
    'Wiki Page',
    PageEditor
  ),
  new TypeInfo(
    'category',
    'Wiki Page Category',
    getNameOnlyEditor('category')
  ),
  new TypeInfo(
    'flash_room',
    'Club Penguin Room',
    FlashroomEditor
  ),
  new TypeInfo(
    'flash_party',
    'Club Penguin Party',
    FlashpartyEditor
  ),
  new TypeInfo(
    'music_catalogue',
    'Music Catalogue',
    MuscatalogEditor
  ),
  new TypeInfo(
    'stage_play',
    'Stage Play',
    StageEditor
  ),
  new TypeInfo(
    'flash_minigame',
    'Club Penguin Minigame',
    FlashgameEditor
  )
]
