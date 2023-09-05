import React from 'react'
import '../../../stylesheets/disambig.css'

export default function DisambigGen ({ data }) {
  return (
    <div>
      <div className='disambig--header'>
        Disambiguation
      </div>
      <div>{data.data.explanation}</div>
      <ul>
        {data.data.links.map((link, i) => (
          <li key={i}>
            <a href={`/${link.pageName}`}>{link.pageName}</a>:
            <span>{link.pageExplanation}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
