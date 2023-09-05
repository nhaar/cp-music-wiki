import React from 'react'
import MarkdownInterpreter from './MarkdownInterpreter'

export default function ({ text }) {
  return (
    <MarkdownInterpreter markdown={text} />
  )
}
