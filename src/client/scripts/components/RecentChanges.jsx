import React, { useEffect, useState } from 'react'
import { getCookies, getMonthName, postAndGetJSON, postJSON } from '../client-utils'
import '../../stylesheets/recent-changes.css'
import Gear from '../../images/gear.png'
import Arrow from '../../images/arrow-down.png'

/** Component with the settings menu for the changes */
function Settings ({ showSettings, settings }) {
  const className = `settings--options ${showSettings ? '' : 'hidden'}`

  function clickResults (i) {
    return () => settings.setResults(() => i)
  }

  function clickPeriod (i) {
    return () => settings.setPeriod(() => i)
  }

  function createButton (value, i, click, state) {
    const className = state === i ? 'selected-button' : ''
    return <button className={className} key={i} onClick={click(i)}> {value} </button>
  }

  function handleCheckbox (e) {
    settings.setGroupTogether(e.target.checked)
  }

  return (
    <div className={className}>
      <div className='settings--top settings--half'>
        <div className='value-picker'>
          <span className='bold'> Results to Show </span>
          <div>
            {settings.RESULT_OPTIONS.map((value, i) => createButton(value, i, clickResults, settings.results))}
          </div>
        </div>
        <div className='settings--group'>
          <input type='checkbox' checked={settings.groupTogether} onChange={handleCheckbox} />
          <span> Group results by page</span>
        </div>
      </div>
      <div className='settings--bottom settings--half'>
        <span className='date-title bold'> Time period to search </span>
        <div className='value-picker'>
          <span className='gray bold'> Recent hours </span>
          <div>
            {settings.HOUR_OPTIONS.map((value, i) => createButton(value, i, clickPeriod, settings.period))}
          </div>
        </div>
        <div className='value-picker'>
          <span className='gray bold'> Recent days </span>
          <div>
            {settings.DAY_OPTIONS.map((value, i) => createButton(value, i + settings.HOUR_OPTIONS.length, clickPeriod, settings.period))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Component for the button for changing the settings */
function ChangesSetting ({ config }) {
  const [showSettings, setShowSettings] = React.useState(false)
  function click () {
    setShowSettings(prev => !prev)
  }

  function addPlural (state, ...options) {
    return !options.includes(state) ? 's' : ''
  }

  function pickPeriodWord () {
    return config.period > config.CUTOFF ? 'day' : 'hour'
  }

  return (
    <div className='settings--container'>
      <img className='gear-img' src={Gear} />
      <button className='settings--button' onClick={click}> {config.RESULT_OPTIONS[config.results]} changes, {config.HOUR_OPTIONS.concat(config.DAY_OPTIONS)[config.period]} {pickPeriodWord()}{addPlural(config.period, 0, 4)} </button>
      <img className='arrow-img' src={Arrow} />
      <Settings showSettings={showSettings} settings={config} />
    </div>
  )
}

/** Component for a single line of grouped deletions */
function DeletionGroup () {
  return (
    <div>
      Deletion!
    </div>
  )
}

/** Component for a single line of grouped changes */
function GroupedChange ({ info }) {
  const [expanded, setExpanded] = useState(false)
  const userCount = {}
  info.users.forEach(user => {
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
        {info.time}&nbsp;
        <a
          style={{
            fontWeight: 'bold'
          }} href={`/Special:Read?id=${info.id}`}
        >{info.name}
        </a> &#40;{info.changes.length} changes | history&#41; . .&nbsp;
        <span className={getDeltaClass(info.size)}>{info.size}&#41;</span> . .
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
            {info.changes.map(getSingleLine)}
          </div>
          )
        : undefined}
    </div>
  )
}

/** Component that lists all the changes in a grouper manner */
function GroupedChanges ({ data }) {
  const groupedData = {}
  for (const day in data) {
    const changes = data[day]
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
        ? <DeletionGroup key={i} />
        : <GroupedChange {...{ info }} key={i} />
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

/** Component that lits all the changes in an ungrouped manner */
function UngroupedChanges ({ data }) {
  const elements = []
  let i = 0
  for (const day in data) {
    const changes = data[day]
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

/**
 * Get a timestamp's time in the local timezone
 * @param {number} timestamp - Epoch timestamp
 * @returns {string} Time in the format `HH:MM`
 */
function getTime (timestamp) {
  const date = new Date(Number(timestamp))
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Get the `CSS` class name for the element that store the size
 * @param {number} size - Size number
 * @returns {string} Class name
 */
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

/**
 * Create a component for a single change
 * @param {object} change - Object with the change's data
 * @param {number} i - Index of the line
 * @returns {Component} Component for a line
 */
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
                reverted: 'Reverted',
                rollback: 'Rollback'
              }[tag]
            }).join(', ')}&#41;
            </span>
            )
          : undefined}
      </li>
    )
  }
}

/** Component for the portion that contains the list of changes */
function Changes ({ config }) {
  const [data, setData] = useState({})

  React.useEffect(() => {
    (async () => {
      const data = await postAndGetJSON('api/recent-changes', {
        days: config.period > config.CUTOFF
          ? config.DAY_OPTIONS[config.period - config.CUTOFF - 1]
          : config.HOUR_OPTIONS[config.period] / 24,
        number: config.RESULT_OPTIONS[config.results]
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
  }, [config.results, config.period])

  return config.groupTogether
    ? (
      <GroupedChanges data={data} />
      )
    : (
      <UngroupedChanges data={data} />
      )
}

/** Component for the recent changes page */
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
        <ChangesSetting config={props} />
      </div>
      <Changes config={props} />
    </div>
  )
}
