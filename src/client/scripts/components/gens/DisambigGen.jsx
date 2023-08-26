import React from 'react'
import '../../../stylesheets/disambig.css'

export default function DisambigGen (props) {
  console.log(props)
  return (
    <div>
      <div className='disambig--header'>
        Disambiguation
      </div>
      <div>{props.arg.data.data.explanation}</div>
      <ul>
        {props.arg.data.data.links.map((link, i) => (
          <li key={i}>
            <a href={`/${link.pageName}`}>{link.pageName}</a>:
            <span>{link.pageExplanation}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
