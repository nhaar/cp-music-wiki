import React from 'react'
import '../../stylesheets/md.css'

export default function MarkdownParser (props) {
  // patterns for matching specifics
  const h2 = '==.*=='
  const h3 = '===.*==='
  const wikiLink = '\\[\\[.*?\\]\\]'
  const outsideLink = '(\\[[^\\[\\]]+\\])'
  const notLink = '([^\\[\\]]+)'

  // break into all text blocks (headers and paragraphs)
  const segments = props.markdown.match(new RegExp(`${h3}|${h2}|.*`, 'g')).map(line => line.trim()).filter(line => line)

  // add special features to inline text blocks (eg links)
  function processLine (line) {
    line = typeof line === 'string' ? line : line[0]
    const segments = line.match(new RegExp(`(?:${wikiLink}|${outsideLink}|${notLink})`, 'g'))
    return segments.map((segment, i) => {
      if (segment.match(wikiLink)) {
        const name = segment.match(/(?<=\[\[).*(?=\]\])/)[0]
        return (
          <a href={`/${name}`} key={i}>
            {name}
          </a>
        )
      } else if (segment.match(outsideLink)) {
        const url = segment.match(/(?<=\[)\S+(?=\s.*)/)[0]
        const text = segment.match(/(?<=\[\S+\s+).*(?=\])/)[0]
        return (
          <a href={url} key={i}>
            {text}
          </a>
        )
      } else {
        return (
          <span key={i}>
            {segment}
          </span>
        )
      }
    })
  }

  // translate into html
  const components = segments.map((line, i) => {
    if (line.match(h3)) {
      return (
        <h3 className='md-h' key={i}>
          {processLine(line.match(/(?<====).*(?====)/))}
        </h3>
      )
    } else if (line.match(h2)) {
      return (
        <h2 className='md-h' key={i}>
          {processLine(line.match(/(?<===).*(?===)/))}
        </h2>
      )
    } else {
      return (
        <p key={i}>
          {processLine(line)}
        </p>
      )
    }
  })

  return (
    <div>
      {components}
    </div>
  )
}
