import { FileEditor, FlashpartyEditor, FlashroomEditor, GenreEditor, InstrumentEditor, KeysigEditor, PageEditor, ReferenceEditor, SongEditor, getNameOnlyEditor } from './editor-modules.js'

class TypeInfo {
  constructor (type, name, editor, input = {}) {
    Object.assign(this, { type, name, Editor: editor, input })
  }
}

export const types = [
  new TypeInfo(
    'song',
    'Song',
    SongEditor
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
  )
]
