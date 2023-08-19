import React from 'react'
import { getJSON, getMonthName } from '../utils'
import '../../stylesheets/recent-changes.css'

function ChangesSetting () {
  return (
    <div />
  )
}

function Changes () {
  const [elements, setElement] = React.useState([])

  React.useEffect(() => {
    (async () => {
      const data = await getJSON('api/recent-changes')
      const elements = []

      let curDate
      let currentList = []
      data.forEach((change, i) => {
        const date = new Date(Number(change.timestamp))
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const time = `${hours}:${minutes}`
        const day = `${date.getDate()} ${getMonthName(date.getMonth())} ${date.getFullYear()}`
        let deltaClass
        if (change.delta > 0) {
          deltaClass = 'positive-diff'
        } else if (change.delta < 0) {
          deltaClass = 'negative-diff'
        } else {
          deltaClass = 'zero-diff'
        }
        function setDate (day) {
          curDate = day
          const lastIndex = elements.length - 1
          const lastElement = elements[lastIndex]
          if (lastElement && lastElement.type === 'span') {
            elements.splice(lastIndex, 1)
          }
          elements.push(
            <span key={i * (-1)}>
              {day}
            </span>
          )
        }
        if ((curDate !== day && curDate !== undefined) || i === change.length - 1) {
          setDate(day)
          elements.push(
            <ul key={i}>
              {currentList}
            </ul>
          )
          currentList = []
        } else if (curDate === undefined) {
          setDate(day)
        }

        currentList.push(
          <li key={i}>
            (<a href={`Diff?old=${change.old}&cur=${change.new}`}> diff </a> | hist )
            . .
            <a href={`editor?t=${change.t}&id=${change.id}`}>
              {change.cls} | {change.name}
            </a>; {time}
            . . <span className={`${deltaClass} diff-number`}>{change.delta}</span> . . {change.user}

          </li>
        )
      })

      setElement(() => elements)
    })()
  }, [])

  return (
    <div>
      {elements}
    </div>
  )
}

export default function RecentChanges () {
  return (
    <div>
      <p>
        Track the most recent changes to the wiki on this page.
      </p>
      <div>
        <ChangesSetting />
      </div>
      <Changes />
    </div>
  )
}
