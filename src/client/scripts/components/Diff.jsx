import React from 'react'
import '../../stylesheets/diff.css'
import { TableModule, addComponentsToDeclarations } from './EditorComponents'

/**
 * Get a readable path from the pretty path from diffs
 * @param {(string|number)[]} path - Pretty path
 * @returns {string}
 */
function getPathText (path) {
  return path.join(' -> ')
}

/**
 * Component that displays the inner changes to an array
 */
function ArrayDiff ({ diff }) {
  const diffComponents = diff.diffs.map((diff, i) => {
    return <ArrayDiffItem diff={diff} type={diff.type} key={i} />
  })

  return (
    <div
      className='column-flex' style={{
        border: '1px solid black',
        padding: '10px',
        rowGap: '10px',
        borderRadius: '5px'
      }}
    >
      <div style={{
        justifyContent: 'left',
        width: '100%',
        marginTop: '-5px',
        marginLeft: '-5px'
      }}
      >
        Changes to an array (list or grid) in: {getPathText(diff.path)}
      </div>
      {diffComponents}
    </div>
  )
}

/**
 * Component that displays one type of inner change to an array
 */
function ArrayDiffItem ({ diff, type }) {
  const declrs = addComponentsToDeclarations(diff.content)
  let borderColor
  let text
  switch (type) {
    case 'add': {
      borderColor = 'green'
      text = 'New element added: Row #' + (diff.index + 1)
      break
    }
    case 'delete': {
      borderColor = 'red'
      text = 'Element deleted: Row #' + (diff.index + 1)
      break
    }
    case 'move': {
      borderColor = 'blue'
      text = `Element moved: From row #${diff.oldIndex + 1} to row #${diff.curIndex + 1}`
      break
    }
  }
  return (
    <div
      className='diff--text-parent' style={{
        borderColor
      }}
    >
      <div style={{
        marginBottom: '5px'
      }}
      >
        {text}
      </div>
      <TableModule declrs={declrs} value={diff.value} path={[]} />
    </div>
  )
}

/** Component for the difference between two revisions page */
export default function Diff ({ diffs }) {
  // function formatValue (value) {
  //   // convert whitespaces

  //   return value.replace(/\s/g, '\u00A0')
  // }

  // const diffChildren = []

  // let i = 0

  // function key () {
  //   i++
  //   return i
  // }

  // function createNewDiff (value, type) {
  //   let sign
  //   let className
  //   if (type === 'add') {
  //     sign = '+'
  //     className = 'add-diff'
  //   } else if (type === 'remove') {
  //     sign = '-'
  //     className = 'remove-diff'
  //   }
  //   diffChildren.push(
  //     <div key={key()}>
  //       <div className='sign'> {sign} </div>
  //       <div className={`diff--text-parent ${className}`}> {value} </div>
  //     </div>
  //   )
  // }

  // const indentInfo = {
  //   indent: 0,
  //   INDENT_SIZE: 4
  // }

  // function addSpan (change, i, isAdd, value) {
  //   let className = ''

  //   function getValue () {
  //     return <span className={`diff--change-text ${className}`} key={i}>{formatValue(value, indentInfo)}</span>
  //   }
  //   if ((change.added && isAdd) || (change.removed && !isAdd)) {
  //     className = isAdd ? 'add-span' : 'remove-span'
  //     return getValue()
  //   } else if (!change.added && !change.removed) {
  //     return getValue()
  //   }
  // }

  // function getBlockText (diff, isAdd) {
  //   const lines = []

  //   let spans = []
  //   diff.forEach((change, i) => {
  //     const split = change.value.split('\n')
  //     split.forEach((segment, j) => {
  //       spans.push(addSpan(change, j, isAdd, segment))
  //       if (j < split.length - 1) {
  //         lines.push([...spans.filter(line => line)])
  //         spans = []
  //       }
  //     })
  //   })

  //   return (
  //     <div className='flex-column'>
  //       {lines.map((line, i) => (
  //         <div
  //           key={i} style={{
  //             display: 'flex'
  //           }}
  //         >{line}
  //         </div>
  //       ))}
  //     </div>
  //   )
  // }

  // diff.forEach(group => {
  //   const type = group[0]
  //   if (type === 'remove' || type === 'add') {
  //     diffChildren.push(
  //       <div key={key()} />
  //     )
  //     const block = getBlockText([group[1]], type === 'add')
  //     createNewDiff(block, type)
  //   } else if (type === 'removeadd') {
  //     const types = ['remove', 'add']
  //     for (let i = 0; i < 2; i++) {
  //       const block = getBlockText(group[3], i === 1)
  //       createNewDiff(block, types[i])
  //     }
  //   }
  // })

  const diffChildren = []

  diffs.forEach(diff => {
    switch (diff.type) {
      case 'array': {
        diffChildren.push(<ArrayDiff diff={diff} />)
        break
      }
    }
  })

  return (
    <div className='diff--container'>
      {diffChildren}
    </div>
  )
}
