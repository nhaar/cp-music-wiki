import React, { useEffect, useState } from 'react'

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
  const [grid, setGrid] = useState(props.value)
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
          <props.component passValue={passValue} value={element} />
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
  const [array, setArray] = useState(props.value)
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
        <props.component value={element} passValue={passValue} />
        <button onMouseDown={clickMove(i)}> MOVE </button>
        <button onClick={deleteRow(i)}> DELETE </button>
      </div>
    )
  })

  return (
    <div>
      {components}
      <button onClick={addRow}>
        ADD
      </button>
    </div>
  )
}

function TableModule (props) {
  const [value, setValue] = useState(props.inputFunction)

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

    components.push(
      <div key={i}>
        <div> {declr.header} </div>
        <declr.Component value={value[declr.property]} passValue={passValue} component={declr.component} />
      </div>
    )
  })

  return (
    <div>
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
  const [value, setValue] = useState({
    hello: [
      ['a', 'b'],
      ['c', 'd']
    ],
    'world!': null
  })
  // const EditorModule = constructEditorModule(props.args.row)

  const declrs = [
    {
      property: 'hello',
      Component: GridRowModule,
      header: 'world!',
      component: TextInputModule
    },
    {
      property: 'world!',
      Component: TextInputModule,
      header: 'hello!'
    }
  ]

  function inputFunction () {
    return value
  }

  function passValue (value) {
    setValue(value)
  }

  return (
    <TableModule declrs={declrs} inputFunction={inputFunction} passValue={passValue} />

  )
}
