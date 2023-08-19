import React from 'react'
import { getJSON, getMonthName } from '../utils'
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

  return (
    <div className={className}>
      <div className='settings--top settings--half'>
        <div className='value-picker'>
          <span className='bold'> Results to Show </span>
          <div>
            {props.settings.resultOptions.map((value, i) => createButton(value, i, clickResults, props.settings.results))}
          </div>
        </div>
        <div className='settings--group'>
          <input type='checkbox' />
          <span> Group results by page</span>
        </div>
      </div>
      <div className='settings--bottom settings--half'>
        <span className='date-title bold'> Time period to search </span>
        <div className='value-picker'>
          <span className='gray bold'> Recent hours </span>
          <div>
            {props.settings.hourOptions.map((value, i) => createButton(value, i, clickPeriod, props.settings.period))}
          </div>
        </div>
        <div className='value-picker'>
          <span className='gray bold'> Recent days </span>
          <div>
            {props.settings.dayOptions.map((value, i) => createButton(value, i + props.settings.hourOptions.length, clickPeriod, props.settings.period))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangesSetting () {
  const [showSettings, setShowSettings] = React.useState(true)
  function click () {
    setShowSettings(prev => !prev)
  }
  const [results, setResults] = React.useState(0)
  const [period, setPeriod] = React.useState(0)
  const resultOptions = [50, 100, 250, 500]
  const hourOptions = [1, 2, 6, 12]
  const dayOptions = [1, 3, 7, 14, 30]

  const settingVars = { results, setResults, period, setPeriod, resultOptions, hourOptions, dayOptions }

  function addPlural (state, ...options) {
    return !options.includes(state) ? 's' : ''
  }

  function pickPeriodWord () {
    return period > 3 ? 'day' : 'hour'
  }

  return (
    <div className='settings--container' onClick={click}>
      <img className='gear-img' src={Gear} />
      <button className='settings--button'> {resultOptions[results]} change{addPlural(results, 0)}, {hourOptions.concat(dayOptions)[period]} {pickPeriodWord()}{addPlural(period, 0, 4)} </button>
      <img className='arrow-img' src={Arrow} />
      <Settings showSettings={showSettings} settings={settingVars} />
    </div>
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
          if (lastElement && lastElement.type !== 'ul') {
            elements.splice(lastIndex, 1)
          }
          elements.push(
            <h4 key={i * (-1)}>
              {day}
            </h4>
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
      <div className='settings--div'>
        <ChangesSetting />
      </div>
      <Changes />
    </div>
  )
}
