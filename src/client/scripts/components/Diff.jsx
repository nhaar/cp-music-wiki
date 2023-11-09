import React, { useEffect } from 'react'
import '../../stylesheets/diff.css'
import { TableModule, addComponentsToDeclarations } from './EditorComponents'
import { postAndGetJSON } from '../client-utils'

/**
 * Get a readable path from the pretty path from diffs
 * @param {(string|number)[]} path - Pretty path
 * @returns {string}
 */
function getPathText (path) {
  return path.join(' -> ')
}

/** Component for a simple diff */
function SimpleDiff ({ diff }) {
  let component
  switch (diff.content) {
    case 'TEXTSHORT': case 'DATE': {
      component = <TextshortDiff diff={diff} />
      break
    }
    case 'TEXTLONG': {
      component = <TextlongDiff diff={diff} />
      break
    }
    case 'ID': {
      component = <IDDiff diff={diff} />
      break
    }
    case 'BOOLEAN': {
      component = <BooleanDiff diff={diff} />
      break
    }
  }

  return (
    <div className='column-flex diff--item'>
      <div className='diff--item-header'>
        Changes to {getPathText(diff.path)}:
      </div>
      {component}
    </div>
  )
}

/**
 * Component for text with chars diffed
 *
 * diff is the result of diffChars
 * add should be true if the line is being placed on the right side
 */
function CharDiffText ({ diff, add }) {
  const className = add
    ? 'add-span'
    : 'remove-span'

  return (
    <div className='flex'>
      {diff.map((change, i) => {
        if ((!add && !change.added) || (add && !change.removed)) {
          const colorClass = ((add && change.added) || (!add && change.removed)) ? className : ''
          return <span key={i} className={`${colorClass}`}>{change.value.replace(' ', '\u00A0')}</span>
        }
        return undefined
      })}
    </div>
  )
}

/**
 * Component for text with a line diffed
 *
 * diff is the result of diffLines
 * add should be true if the line is being placed on the right side
 */
function LineDiffDeltaComponent ({ diff, add }) {
  const sign = add ? '+' : '-'
  return (
    <div
      style={{
        display: 'flex',
        width: '100%'
      }}
    >
      <div className='sign'>{sign}</div>
      <div
        className='diff--text-parent' style={{
          display: 'flex',
          flexDirection: 'row',
          borderColor: add ? 'green' : 'red'
        }}
      >
        <CharDiffText diff={diff} add={add} />
      </div>
    </div>
  )
}

function LineDiffComponent ({ diff }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 50%)',
      width: '100%'
    }}
    >
      <LineDiffDeltaComponent diff={diff} />
      <LineDiffDeltaComponent diff={diff} add />
    </div>
  )
}

/** Component for a TEXTSHORT diff */
function TextshortDiff ({ diff }) {
  return <LineDiffComponent diff={diff.delta} />
}

function TextlongDiff ({ diff }) {
  const components = diff.delta.map((change, i) => {
    switch (change.type) {
      case 'change': {
        return <LineDiffComponent diff={change.value} key={i} />
      }
    }
    return undefined
  })
  return (
    <div>
      {components}
    </div>
  )
}

/** Component that shows difference between IDs */
function IDDiff ({ diff }) {
  const [delta, setDelta] = React.useState([])

  useEffect(() => {
    (async () => {
      const ids = {
        old: diff.old,
        cur: diff.cur
      }
      for (const idName in ids) {
        const id = ids[idName]
        console.log(id)
        const { name } = await postAndGetJSON('api/get-name', { id })
        ids[idName] = name
      }
      setDelta([{ removed: true, value: ids.old }, { added: true, value: ids.cur }])
    })()
  }, [])

  return (
    <LineDiffComponent diff={delta} />
  )
}

/** Component for showing difference for a boolean value (checkboxes) */
function BooleanDiff ({ diff }) {
  const delta = [{ removed: true, value: diff.old }, { added: true, value: diff.cur }]
  return (
    <LineDiffComponent diff={delta} />
  )
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
      className='column-flex diff--item' style={{
        rowGap: '10px'
      }}
    >
      <div className='diff--item-header'>
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
      case 'simple': {
        diffChildren.push(<SimpleDiff diff={diff} />)
        break
      }
      case 'array': {
        diffChildren.push(<ArrayDiff diff={diff} />)
        break
      }
      default: {
        throw new Error('Invalid diff type')
      }
    }
  })

  return (
    <div className='diff--container'>
      {diffChildren}
    </div>
  )
}
