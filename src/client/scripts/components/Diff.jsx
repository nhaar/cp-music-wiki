import React from 'react'
import '../../stylesheets/diff.css'

export default function Diff ({ diff }) {
  function formatValue (value, info) {
    // convert whitespaces

    return value.replace(/\s/g, '\u00A0')
    // const lastChars = line.substring(line.length - 2)
    // if (lastChars.match(/}|\]/)) {
    //   info.indent -= 1
    // }
    // const indents = []
    // for (let j = 0; j < info.indent; j++) {
    //   for (let k = 0; k < info.INDENT_SIZE; k++) {
    //     indents.push()
    //   }
    // }
    // const newLine = `${indents.join('')}${line}`

    // if (lastChars.match(/{|\[/)) {
    //   info.indent += 1
    // }

    // return newLine
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

  const indentInfo = {
    indent: 0,
    INDENT_SIZE: 4
  }

  function addSpan (change, i, isAdd, value) {
    let className = ''

    function getValue () {
      return <span className={`diff--change-text ${className}`} key={i}>{formatValue(value, indentInfo)}</span>
    }
    if ((change.added && isAdd) || (change.removed && !isAdd)) {
      className = isAdd ? 'add-span' : 'remove-span'
      return getValue()
    } else if (!change.added && !change.removed) {
      return getValue()
    }
  }

  function getBlockText (diff, isAdd) {
    const lines = []

    let spans = []
    diff.forEach((change, i) => {
      const split = change.value.split('\n')
      split.forEach((segment, j) => {
        spans.push(addSpan(change, j, isAdd, segment))
        if (j < split.length - 1) {
          lines.push([...spans.filter(line => line)])
          spans = []
        }
      })
    })

    return (
      <div className='flex-column'>
        {lines.map((line, i) => (
          <div
            key={i} style={{
              display: 'flex'
            }}
          >{line}
          </div>
        ))}
      </div>
    )
  }

  diff.forEach(group => {
    const type = group[0]
    if (type === 'remove' || type === 'add') {
      diffChildren.push(
        <div key={key()} />
      )
      const block = getBlockText([group[1]], type === 'add')
      createNewDiff(block, type)
    } else if (type === 'removeadd') {
      const types = ['remove', 'add']
      for (let i = 0; i < 2; i++) {
        const block = getBlockText(group[3], i === 1)
        createNewDiff(block, types[i])
      }
    }
  })

  return (
    <div className='diff--container'>
      {diffChildren}
    </div>
  )
}
