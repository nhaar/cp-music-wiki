import React, { useEffect, useState } from 'react'

import '../../stylesheets/editor.css'

// element modules
// array modules
// editor module

function TextInputModule (props) {
  const getValue = value => value || ''
  const [value, setValue] = useState(() => getValue(props.value))

  useEffect(() => {
    setValue(getValue(props.value))
  }, [props.value])

  function updateValue (e) {
    const { value } = e.target
    setValue(value)
    props.passValue(value || null)
  }

  return (
    <input value={value} type='text' onChange={updateValue} />
  )
}

function GridRowModule (props) {
  const [grid, setGrid] = useState(props.value || [])
  const [rows, setRows] = useState(props.value.length || 0)
  const [columns, setColumns] = useState(() => {
    let columns = 0
    if (props.value) {
      props.value.forEach(element => {
        if (element.length > columns) columns = element.length
      })
    }

    return columns || 1
  })
  const [isMoving, setIsMoving] = useState(false)
  const [originalPos, setOriginalPos] = useState(-1)

  const values = []
  grid.forEach(col => {
    for (let j = 0; j < columns; j++) {
      values.push(col[j] || null)
    }
  })

  function startMoving (k) {
    return () => {
      setOriginalPos(k)
      setIsMoving(true)
    }
  }

  function stopMoving (k) {
    return () => {
      if (isMoving) {
        const [x, y] = getCoords(k)
        const valueInPos = grid[x][y]
        const [i, j] = getCoords(originalPos)
        setGrid(g => {
          const newG = [...g]
          newG[x][y] = newG[i][j]
          newG[i][j] = valueInPos
          return newG
        })
      }
    }
  }

  function removeRow () {
    if (rows > 0) {
      setGrid(g => {
        const newG = [...g]
        newG.splice(newG.length - 1, 1)
        setRows(r => r - 1)
        return newG
      })
    }
  }

  function removeColumn () {
    if (columns > 1) {
      setGrid(g => {
        const newG = [...g]
        newG.forEach(row => {
          row.splice(row.length - 1, 1)
        })
        setColumns(c => c - 1)
        return newG
      })
    }
  }

  function addRow () {
    const row = []
    for (let i = 0; i < columns; i++) {
      row.push(null)
    }
    setGrid(g => {
      const newG = [...g]
      newG.push(row)
      setRows(r => r + 1)
      return newG
    })
  }

  function addColumn () {
    setGrid(g => {
      const newG = [...g]
      for (let i = 0; i < rows; i++) {
        newG[i].push(null)
      }

      setColumns(c => c + 1)
      return newG
    })
  }

  function getCoords (k) {
    return [Math.floor(k / columns), k % rows]
  }

  const components = values.map((element, k) => {
    function passValue (value) {
      const [i, j] = getCoords(k)
      setGrid(g => {
        const newG = [...g]
        newG[i][j] = value
        return newG
      })
    }

    return (
      <div key={k}>
        <div onMouseUp={stopMoving(k)}>
          <props.component passValue={passValue} value={element} declrs={declrs} />
          <button onMouseDown={startMoving(k)}> Move </button>
        </div>
      </div>
    )
  })

  const style = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
  }

  return (
    <div>
      <div className='grid-module' style={style}>
        {components}
      </div>
      <button onClick={removeRow}>
        Remove Row
      </button>
      <button onClick={addRow}>
        Add Row
      </button>
      <button onClick={removeColumn}>
        Remove Column
      </button>
      <button onClick={addColumn}>
        Add Column
      </button>
    </div>
  )
}

function MoveableRowsModule (props) {
  const [array, setArray] = useState(props.value || [])
  const [isMoving, setIsMoving] = useState(false)
  const [originalPos, setOriginalPos] = useState(-1)

  function deleteRow (i) {
    return () => {
      setArray(a => {
        const newA = [...a]
        newA.splice(i, 1)
        return newA
      })
    }
  }

  function addRow () {
    setArray(a => [...a, null])
  }

  function clickMove (i) {
    return () => {
      setIsMoving(true)
      setOriginalPos(i)
    }
  }

  function finishMove (i) {
    return () => {
      if (isMoving) {
        setArray(a => {
          const newA = [...a]
          const removed = newA.splice(originalPos, 1)
          newA.splice(i, 0, ...removed)
          return newA
        })
      }
    }
  }

  const components = array.map((element, i) => {
    function passValue (value) {
      setArray(a => {
        const newA = [...a]
        newA[i] = [value]
        return newA
      })
    }

    return (
      <div key={i} onMouseUp={finishMove(i)}>
        <props.component value={element} passValue={passValue} declrs={props.declrs} />
        <button onMouseDown={clickMove(i)}> MOVE </button>
        <button onClick={deleteRow(i)}> DELETE </button>
      </div>
    )
  })

  return (
    <div className='moveable-module'>
      {components}
      <button onClick={addRow}>
        ADD
      </button>
    </div>
  )
}

function TableModule (props) {
  function getDefault () {
    const defaultValue = {}
    props.declrs.forEach(declr => {
      defaultValue[declr.property] = null
    })
    return defaultValue
  }
  const [value, setValue] = useState(() => props.value || getDefault())

  const components = []
  props.declrs.forEach((declr, i) => {
    function passValue (value) {
      setValue(v => {
        const newV = { ...v }
        newV[declr.property] = value
        props.passValue(newV)
        return newV
      })
    }

    console.log(value, declr.property)

    components.push(
      <div key={i} className='table-row'>
        <div> {declr.header} </div>
        <declr.Component value={value[declr.property]} passValue={passValue} component={declr.component} declrs={declr.declrs} />
      </div>
    )
  })

  return (
    <div className='table-module'>
      {components}
    </div>
  )
}

// function getModule (children, inputFunction, outputFunction) {
//   return () => {

//     return (
//       <div>
//         {children.map(Child => {
//           return <Child />
//         })}
//       </div>
//     )
//   }
// }

export default function Editor (props) {
  // props.args.row.data
  const [data, setData] = useState(props.args.row.data)

  const iterate = (obj) => {
    const declrs = []

    for (const property in obj) {
      const declr = {}
      const [fullType, header, desc, args] = obj[property]
      declr.property = property
      declr.header = header
      let type = fullType
      let arrayModule
      if (Array.isArray(type)) {
        const dim = type[1]
        type = type[0]
        if (dim === 1) {
          arrayModule = MoveableRowsModule
        } else if (dim === 2) {
          arrayModule = GridRowModule
        }
      }
      if (typeof type === 'object') {
        declr.Component = TableModule
        declr.declrs = iterate(type)
      } else {
        declr.Component = TextInputModule
      }

      if (arrayModule) {
        declr.component = declr.Component
        declr.Component = arrayModule
      }

      declrs.push(declr)
    }

    return declrs
  }

  // props.args.editorData.main
  const declrs = iterate(props.args.editorData.main)

  return (
    <TableModule className='editor' declrs={declrs} value={data} passValue={setData} />
  )
}
