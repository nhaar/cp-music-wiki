import {  nameOnlyEditor } from "./editor-modules.js"

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
    {
      file: `
        SELECT file
        WHERE song = @id
      `
    }
  ),
  new TypeInfo(
    'author',
    'Author',
    nameOnlyEditor('author')
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
  {
    type: 'wiki_reference',
    name: 'Reference'
  }
]
