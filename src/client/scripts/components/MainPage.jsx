import React from 'react'
import MarkdownInterpreter from './MarkdownInterpreter'

export default function (props) {
  return (
    <MarkdownInterpreter markdown={props.arg} />
  )
}
