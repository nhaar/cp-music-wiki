import React, { useEffect, useState } from 'react'
import { getCookies, getMonthName, postAndGetJSON, postJSON } from '../client-utils'
import '../../stylesheets/recent-changes.css'
import Gear from '../../images/gear.png'
import Arrow from '../../images/arrow-down.png'

function Settings (props) {
  const className = `settings--options ${props.showSettings ? '' : 'hidden'}`

  function clickResults (i) {
    return () => props.settings.setResults(() => i)
  }

  function clickPeriod (i) {
    return () => props.settings.setPeriod(() => i)
  }

  function createButton (value, i, click, state) {
    const className = state === i ? 'selected-button' : ''
    return <button className={className} key={i} onClick={click(i)}> {value} </button>
  }

  function handleCheckbox (e) {
    props.settings.setGroupTogether(e.target.checked)
  }

  return (
    <div className={className}>
      <div className='settings--top settings--half'>
        <div className='value-picker'>
          <span className='bold'> Results to Show </span>
          <div>
            {props.settings.RESULT_OPTIONS.map((value, i) => createButton(value, i, clickResults, props.settings.results))}
          </div>
        </div>
        <div className='settings--group'>
          <input type='checkbox' checked={props.settings.groupTogether} onChange={handleCheckbox} />
          <span> Group results by page</span>
        </div>
      </div>
      <div className='settings--bottom settings--half'>
        <span className='date-title bold'> Time period to search </span>
        <div className='value-picker'>
          <span className='gray bold'> Recent hours </span>
          <div>
            {props.settings.HOUR_OPTIONS.map((value, i) => createButton(value, i, clickPeriod, props.settings.period))}
          </div>
        </div>
        <div className='value-picker'>
          <span className='gray bold'> Recent days </span>
          <div>
            {props.settings.DAY_OPTIONS.map((value, i) => createButton(value, i + props.settings.HOUR_OPTIONS.length, clickPeriod, props.settings.period))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangesSetting (props) {
  const [showSettings, setShowSettings] = React.useState(false)
  function click () {
    setShowSettings(prev => !prev)
  }

  function addPlural (state, ...options) {
    return !options.includes(state) ? 's' : ''
  }

  function pickPeriodWord () {
    return props.period > props.CUTOFF ? 'day' : 'hour'
  }

  return (
    <div className='settings--container'>
      <img className='gear-img' src={Gear} />
      <button className='settings--button' onClick={click}> {props.RESULT_OPTIONS[props.results]} changes, {props.HOUR_OPTIONS.concat(props.DAY_OPTIONS)[props.period]} {pickPeriodWord()}{addPlural(props.period, 0, 4)} </button>
      <img className='arrow-img' src={Arrow} />
      <Settings showSettings={showSettings} settings={props} />
    </div>
  )
}

function DeletionGroup (props) {
  return (
    <div>
      Deletion!
    </div>
  )
}

function GroupedChange (props) {
  const [expanded, setExpanded] = useState(false)
  const userCount = {}
  props.info.users.forEach(user => {
    if (userCount[user]) userCount[user]++
    else userCount[user] = 1
  })

  return (
    <div
      style={{
        marginBottom: '20px'
      }}
    >
      <div>
        <div
          onClick={() => setExpanded(!expanded)} style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'inline-block'
          }}
        >
          {'>'}&nbsp;&nbsp;&nbsp;
        </div>
        {props.info.time}&nbsp;
        <a
          style={{
            fontWeight: 'bold'
          }} href={`/Special:Read?id=${props.info.id}`}
        >{props.info.name}
        </a> &#40;{props.info.changes.length} changes | history&#41; . .&nbsp;
        <span className={getDeltaClass(props.info.size)}>{props.info.size}&#41;</span> . .
        &#91;
        {Object.entries(userCount).map(userCount => {
          const count = userCount[1]
          return `${userCount[0]}${count === 1 ? '' : ` (${count}x)`}`
        }).join(', ')}&#93;
      </div>
      {expanded
        ? (
          <div style={{
            paddingLeft: '50px'
          }}
          >
            {props.info.changes.map(getSingleLine)}
          </div>
          )
        : undefined}
    </div>
  )
}

function GroupedChanges (props) {
  const groupedData = {}
  for (const day in props.data) {
    const changes = props.data[day]
    groupedData[day] = {}
    changes.forEach(change => {
      const key = `${change.id}${change.deletionLog}`
      if (groupedData[day][key]) {
        groupedData[day][key].users.push(change.user)
        groupedData[day][key].changes.push(change)
        groupedData[day][key].size += change.delta
      } else {
        groupedData[day][key] = {
          users: [change.user],
          time: getTime(change.timestamp),
          changes: [change],
          size: change.delta,
          id: change.id,
          name: `${change.cls} | ${change.name}`,
          deletionLog: change.deletionLog
        }
      }
    })
  }

  const components = []
  let i = 0
  for (const day in groupedData) {
    components.push(
      <h4 key={i}>
        {day}
      </h4>
    )
    i++
    const lis = []
    const items = groupedData[day]
    for (const item in items) {
      const info = items[item]
      lis.push(info.deletionLog
        ? <DeletionGroup {...{ info, item }} key={i} />
        : <GroupedChange {...{ info, item }} key={i} />
      )
      i++
    }
    components.push(
      <div key={i}>
        {lis}
      </div>
    )
    i++
  }
  return (
    <div>
      {components}
    </div>
  )
}

function UngroupedChanges (props) {
  const elements = []
  let i = 0
  for (const day in props.data) {
    const changes = props.data[day]
    elements.push(
      <h4 key={i}>{day}</h4>
    )
    i++
    elements.push(
      <ul key={i}>
        {changes.map(getSingleLine)}
      </ul>
    )
    i++
  }
  return (
    <div>
      {elements}
    </div>
  )
}

function getTime (timestamp) {
  const date = new Date(Number(timestamp))
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getDeltaClass (size) {
  let className = ''
  if (size > 0) {
    className = 'positive-diff'
  } else if (size < 0) {
    className = 'negative-diff'
  } else className = 'zero-diff'
  if (Math.abs(size) > 1000) {
    className = `${className} bold`
  }
  return className
}

function getSingleLine (change, i) {
  const time = getTime(change.timestamp)
  const itemLink = (
    <a
      href={`/Special:Read?id=${change.id}`} style={{
        fontWeight: 'bold'
      }}
    >
      {change.cls} | {change.name}
    </a>
  )
  if (change.deletionLog) {
    return (
      <li>
        (Deletion log); {time} . . {change.user}
        {change.deletion
          ? 'Deleted '
          : 'Undeleted '}
        {itemLink}
      </li>
    )
  } else {
    const deltaClass = getDeltaClass(change.delta)

    async function handleRollbackClick () {
      await postJSON('api/rollback', { user: change.userId, item: change.id })
      window.alert('Rollback applied')
      window.location.reload()
    }

    return (
      <li key={`-${i}`}>
        &#40;{change.old
        ? (
          <a href={`/Special:Diff?old=${change.old}&cur=${change.cur}`}> diff </a>
          )
        : ' diff '} | hist &#41;
        . .
        {change.old
          ? undefined
          : (
            <span>
              &nbsp;
              <span
                style={{
                  fontWeight: 'bold',
                  textDecoration: 'underline dotted',
                  cursor: 'help'
                }} title='This edit created a new item'
              >N
              </span>
              &nbsp;
            </span>
            )}
        {itemLink}; {time}
        . . <span className={`${deltaClass} diff-number`}>{change.delta}</span> . . {change.user}
        {change.rollback
          ? (
            <span>
              &nbsp;&#91;<a onClick={handleRollbackClick}>rollback</a>&#93;
            </span>
            )
          : undefined}
        {change.tags
          ? (
            <span> &#40;Tags: {change.tags.split('%').map(tag => {
              return {
                0: 'Reverted',
                1: 'Rollback'
              }[tag]
            })}&#41;
            </span>
            )
          : undefined}
      </li>
    )
  }
}

function Changes (props) {
  const [data, setData] = useState({})

  React.useEffect(() => {
    (async () => {
      const data = await postAndGetJSON('api/recent-changes', {
        days: props.period > props.CUTOFF
          ? props.DAY_OPTIONS[props.period - props.CUTOFF - 1]
          : props.HOUR_OPTIONS[props.period] / 24,
        number: props.RESULT_OPTIONS[props.results]
      })

      const dividedInDays = {}
      data.forEach(change => {
        const date = new Date(Number(change.timestamp))
        const day = `${date.getDate()} ${getMonthName(date.getMonth())} ${date.getFullYear()}`
        if (dividedInDays[day]) {
          dividedInDays[day].push(change)
        } else {
          dividedInDays[day] = [change]
        }
      })
      setData(dividedInDays)
    })()
  }, [props.results, props.period])

  return props.groupTogether
    ? (
      <GroupedChanges data={data} />
      )
    : (
      <UngroupedChanges data={data} />
      )
}

export default function RecentChanges () {
  const cookies = getCookies()
  const [results, setResults] = useState(Number(cookies.recentChangeResults) || 0)
  const [period, setPeriod] = useState(Number(cookies.recentChangePeriod) || 0)
  const [groupTogether, setGroupTogether] = useState(Number(cookies.recentChangeGroup) !== 0)

  useEffect(() => {
    document.cookie = `recentChangeResults=${results}`
    document.cookie = `recentChangePeriod=${period}`
    document.cookie = `recentChangeGroup=${Number(groupTogether)}`
  }, [results, period, groupTogether])

  const props = {
    results,
    period,
    groupTogether,
    setResults,
    setPeriod,
    setGroupTogether,
    RESULT_OPTIONS: [50, 100, 250, 500],
    HOUR_OPTIONS: [1, 2, 6, 12],
    DAY_OPTIONS: [1, 3, 7, 14, 30],
    CUTOFF: 3
  }

  return (
    <div>
      <p>
        Track the most recent changes to the wiki on this page.
      </p>
      <div className='settings--div'>
        <ChangesSetting {...props} />
      </div>
      <Changes {...props} />
    </div>
  )
}
