import React from 'react'
import '../../stylesheets/md.css'
import MarkdownParser from '../markdown-parser'

/** Component for an element that will display text converted from markdown */
export default function MarkdownInterpreter ({ markdown }) {
  const parser = new MarkdownParser(markdown)
  parser.parse()

  const components = parser.blocks.map((block, i) => {
    const subcomponents = block.text.map((subblock, j) => {
      if (subblock.type === 'text') {
        return (
          <span key={j}>{subblock.text}</span>
        )
      } else if (subblock.type === 'wikilink') {
        return (
          <a href={`/${subblock.page}`} key={j}>
            {subblock.page}
          </a>
        )
      } else if (subblock.type === 'hyperlink') {
        return (
          <a href={subblock.url} key={j}>
            {subblock.text}
          </a>
        )
      }
      return ''
    })

    return (
      <block.type key={i} className={block.type === 'h2' ? 'md-h2 md-h' : ''}>
        {subcomponents}
      </block.type>
    )
  })

  return (
    <div>
      {components}
    </div>
  )
}
