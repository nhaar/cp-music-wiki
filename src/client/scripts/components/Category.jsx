import React from 'react'
import '../../stylesheets/category.css'

export default function Category ({ pages, cur, name }) {
  const onDisplay = Math.max(0, pages.length - cur + 1)
  const displayedPages = pages.sort().slice(cur - 1, onDisplay + 1)
  const normalLength = 200

  const columns = [[], []]

  let letter
  let group = []
  function pushComponent (i, component) {
    columns[Math.floor(i * 2 / normalLength)].push(component)
  }

  function pushGroup (i, isSecond) {
    pushComponent(i, (
      <ul key={`${isSecond ? '+' : '-'}` + i}>
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
        <h3 key={i}>
          {firstLetter}
        </h3>
      ))
    }
    group.push(page)

    if (i === Math.floor(normalLength / 2) - 1 || i === displayedPages.length - 1) {
      pushGroup(i, true)
    }
  })

  const prev = '(previous page)'
  const next = '(next page)'

  return (
    <div className='category-page'>
      <div className='category-intro'>
        The following {onDisplay === 1 ? '' : onDisplay} page{onDisplay !== 1 ? 's' : ''} {onDisplay === 1 ? 'is' : 'are'} in this category
        {pages.length > onDisplay
          ? `, out of ${pages.length} total`
          : ''}.
      </div>
      <div className='page-changers'>
        {cur > 1
          ? (
            <a href={`/Category:${name}?cur=${Math.max(1, cur - normalLength)}`}>
              {prev}
            </a>
            )
          : (
            <div>
              {prev}
            </div>
            )}
        {cur + onDisplay <= pages.length
          ? (
            <a href={`/Category:${name}?cur=${Math.min(pages.length, cur + normalLength)}`}>
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
