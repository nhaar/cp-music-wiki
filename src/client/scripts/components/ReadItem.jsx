import React from 'react'
import Editor from './Editor'

export default function ReadItem ({ structure, isStatic, row, isDeleted, n }) {
  return (
    <Editor {...{ editor: false, structure, isStatic, row, isDeleted, n }} />
  )
}
