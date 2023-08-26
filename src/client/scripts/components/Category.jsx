import React from 'react'
import '../../stylesheets/category.css'

export default function Category (props) {
  const onDisplay = Math.max(0, props.arg.pages.length - props.arg.cur + 1)
  const displayedPages = props.arg.pages.sort().splice(props.arg.cur - 1, onDisplay + 1)
  const normalLength = 200

  const columns = [[], []]

  let letter
  let group = []
  function pushComponent (i, component) {
    columns[Math.floor(i * 2 / normalLength)].push(component)
  }

  function pushGroup (i) {
    pushComponent(i, (
      <ul key={'-' + i}>
        {group.map((name, i) => (
          <li key={i}>
            <a href={`/${name}`}>
              {name}
            </a>
          </li>
        ))}
      </ul>
    ))
    group = []
  }

  displayedPages.forEach((page, i) => {
    const firstLetter = page.substring(0, 1)
    if (firstLetter !== letter) {
      if (letter !== '') pushGroup(i)
      letter = firstLetter
      pushComponent(i, (
        <h3>
          {firstLetter}
        </h3>
      ))
    }
    group.push(page)

    if (i === Math.floor(normalLength / 2) - 1 || i === displayedPages.length - 1) {
      pushGroup(i)
    }
  })

  const prev = '(previous page)'
  const next = '(next page)'

  return (
    <div className='category-page'>
      <div className='category-intro'>
        The following {onDisplay === 1 ? '' : onDisplay} page{onDisplay !== 1 ? 's' : ''} {onDisplay === 1 ? 'is' : 'are'} in this category
        {props.arg.pages.length > onDisplay
          ? `, out of ${props.arg.pages.length} total`
          : ''}.
      </div>
      <div className='page-changers'>
        {props.arg.cur > 1
          ? (
            <a href={`/Category:${props.arg.name}?cur=${Math.max(1, props.arg.cur - normalLength)}`}>
              {prev}
            </a>
            )
          : (
            <div>
              {prev}
            </div>
            )}
        {props.arg.cur + onDisplay <= props.arg.pages.length
          ? (
            <a href={`/Category:${props.arg.name}?cur=${Math.min(props.arg.pages.length, props.arg.cur + normalLength)}`}>
              {next}
            </a>
            )
          : <div>{next}</div>}

      </div>
      <div className='page-list'>
        {columns.map((col, i) => (
          <div key={i}>
            {col}
          </div>
        ))}
      </div>
    </div>
  )
}
