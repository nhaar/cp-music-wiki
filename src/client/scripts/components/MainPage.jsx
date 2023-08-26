import React from 'react'
import MarkdownParser from './MarkdownParser'

export default function (props) {
  return (
    <MarkdownParser markdown={props.arg} />
  )
}
