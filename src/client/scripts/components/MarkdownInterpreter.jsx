import React from 'react'
import '../../stylesheets/md.css'
import MarkdownParser from '../markdown-parser'

export default function MarkdownInterpreter (props) {
  const parser = new MarkdownParser(props.markdown)
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
      <block.type key={i}>
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

/*
output of lexer:

*** start here
===
Hello World!
===
Welcome to the Club Penguin Music Wiki!

SIKE! this is just a freaking DEV VERSION MWAHAHAHAH

the only freaking page that exists is
[[
King of Kingston
]]
for some reason

visit
[
url
this for an actual decent wiki engine LMAO
]

now I'm gonna go by

==
header here for some unknown reason
==
I said BYE
*/
