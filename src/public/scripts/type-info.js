import { FileEditor, ReferenceEditor, SongEditor, getNameOnlyEditor } from './editor-modules.js'

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
  )
]
