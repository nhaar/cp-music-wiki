import React, { useEffect } from 'react'
import { getCookies, getMonthName, postAndGetJSON } from '../client-utils'
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
            {props.settings.RESULT_OPTIONS.map((value, i) => createButton(value, i, clickResults, props.settings.results))}
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
      <button className='settings--button' onClick={click}> {props.RESULT_OPTIONS[props.results]} change{addPlural(props.results, 0)}, {props.HOUR_OPTIONS.concat(props.DAY_OPTIONS)[props.period]} {pickPeriodWord()}{addPlural(props.period, 0, 4)} </button>
      <img className='arrow-img' src={Arrow} />
      <Settings showSettings={showSettings} settings={props} />
    </div>
  )
}

function Changes (props) {
  const [elements, setElement] = React.useState([])

  React.useEffect(() => {
    (async () => {
      const data = await postAndGetJSON('api/recent-changes', {
        days: props.period > props.CUTOFF
          ? props.DAY_OPTIONS[props.period - props.CUTOFF - 1]
          : props.HOUR_OPTIONS[props.period] / 24,
        number: props.RESULT_OPTIONS[props.results]
      })
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

        currentList.push(
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
            <a
              href={`/Special:Read?id=${change.id}`} style={{
                fontWeight: 'bold'
              }}
            >
              {change.cls} | {change.name}
            </a>; {time}
            . . <span className={`${deltaClass} diff-number`}>{change.delta}</span> . . {change.user}

          </li>
        )

        // no ul means remove datwe
        function setDate (day) {
          curDate = day
          const lastIndex = elements.length - 1
          const lastElement = elements[lastIndex]
          if (lastElement && lastElement.type !== 'ul') {
            elements.splice(lastIndex, 1)
          }
          elements.push(
            <h4 key={`+${i}`}>
              {day}
            </h4>
          )
        }
        if ((curDate !== day && curDate !== undefined) || i === data.length - 1) {
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
      })

      setElement(elements)
    })()
  }, [props.results, props.period])

  return (
    <div>
      {elements}
    </div>
  )
}

export default function RecentChanges () {
  const cookies = getCookies()
  const [results, setResults] = React.useState(Number(cookies.recentChangeResults) || 0)
  const [period, setPeriod] = React.useState(Number(cookies.recentChangePeriod) || 0)

  useEffect(() => {
    document.cookie = `recentChangeResults=${results}`
    document.cookie = `recentChangePeriod=${period}`
  }, [results, period])

  const props = {
    results,
    period,
    setResults,
    setPeriod,
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
