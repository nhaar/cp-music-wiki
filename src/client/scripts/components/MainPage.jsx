import React from 'react'
import MarkdownInterpreter from './MarkdownInterpreter'

/** Component for the wiki's main page/home page */
export default function ({ text }) {
  return (
    <MarkdownInterpreter markdown={text} />
  )
}
