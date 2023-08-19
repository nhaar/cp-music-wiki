import React from 'react'
import '../../stylesheets/diff.css'

export default function Diff (props) {
  function formatValue (value) {
    // convert whitespaces
    const lines = value.split('\n')
    return (
      lines.map((line, i) => {
        return <div key={i}><span>{line.replace(/\s/g, '\u00A0')}</span></div>
      })
    )
  }

  const diffChildren = []

  let i = 0

  function key () {
    i++
    return i
  }

  function createNewDiff (value, type) {
    let sign
    let className
    if (type === 'add') {
      sign = '+'
      className = 'add-diff'
    } else if (type === 'remove') {
      sign = '-'
      className = 'remove-diff'
    }
    diffChildren.push(
      <div key={key()}>
        <div className='sign'> {sign} </div>
        <div className={`diff--text-parent ${className}`}> {value} </div>
      </div>
    )
  }

  function addSpan (change, i, isAdd) {
    let className = ''
    function getValue () {
      return <span className={`diff--change-text ${className}`} key={i}>{formatValue(change.value)}</span>
    }
    if ((change.added && isAdd) || (change.removed && !isAdd)) {
      className = isAdd ? 'add-span' : 'remove-span'
      return getValue()
    } else if (!change.added && !change.removed) {
      return getValue()
    }
  }

  function createHTML (diff, isAdd) {
    const elements = []

    diff.forEach((change, i) => {
      elements.push(addSpan(change, i, isAdd))
    })

    return elements
  }

  props.args.forEach(group => {
    const type = group[0]
    if (type === 'remove' || type === 'add') {
      diffChildren.push(
        <div key={key()} />
      )
      console.log(group[1])
      createNewDiff(<div>{addSpan(group[1], -1, true)}</div>, type)
    } else if (type === 'removeadd' || type === 'addremove') {
      const types = type.match(/(remove|add)/g)
      for (let i = 0; i < 2; i++) {
        const value = createHTML(group[3], i)
        createNewDiff(<div>{value}</div>, types[i])
      }
    }
  })

  return (
    <div className='diff--container'>
      {diffChildren}
    </div>
  )
}
