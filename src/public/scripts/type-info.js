import {
  EPFEditor,
  FileEditor, FlashgameEditor, FlashpartyEditor, FlashroomEditor,
  GenreEditor, InstrumentEditor, KeysigEditor, MuscatalogEditor,
  NameOnlyEditor, PCAppearanceEditor, PageEditor, ReferenceEditor, SongEditor,
  StageEditor
} from './modules/editor-modules.js'

class TypeInfo {
  constructor (type, name, editor, isStatic = false) {
    Object.assign(this, { type, name, Editor: editor, isStatic })
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
    NameOnlyEditor
  ),
  new TypeInfo(
    'source',
    'Source',
    NameOnlyEditor
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
    NameOnlyEditor
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
  ),
  new TypeInfo(
    'epf_ost',
    'Elite Penguin Force OST',
    EPFEditor,
    true
  ),
  new TypeInfo(
    'penguin_chat_appearance',
    'Penguin Chat Music Use',
    PCAppearanceEditor
  )
]
