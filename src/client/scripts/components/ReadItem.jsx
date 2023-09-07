import React from 'react'
import Editor from './Editor'

/** Component for the item reader */
export default function ReadItem ({ structure, isStatic, row, isDeleted, n, watching }) {
  return (
    <Editor {...{ editor: false, structure, isStatic, row, isDeleted, n, watching }} />
  )
}
