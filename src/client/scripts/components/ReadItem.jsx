import React from 'react'
import Editor from './Editor'

export default function ReadItem (props) {
  return (
    <Editor editor={false} {...props} />
  )
}
