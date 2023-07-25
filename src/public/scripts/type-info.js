import {  ReferenceEditor, SongEditor, TestEditor, nameOnlyEditor } from "./editor-modules.js"

nameOnlyEditor

class TypeInfo {
  constructor (type, name, editor, input = {}) {
    Object.assign(this, { type, name, editor, input })
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
    TestEditor
  ),
  new TypeInfo(
    'source',
    'Source',
    nameOnlyEditor('source')
  ),
  {
    type: 'file',
    name: 'File'
  },
  new TypeInfo(
    'wiki_reference',
    'Reference',
    ReferenceEditor
  )
]
