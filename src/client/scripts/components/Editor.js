import React, { useEffect, useState } from 'react'

import '../../stylesheets/editor.css'
import QueryInput from './QueryInput'
import { getCookies, postAndGetJSON, postJSON } from '../utils'

// element modules
// array modules
// editor module

function getSimpleTextModule (Tag, type) {
  return function (props) {
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
      <Tag value={value} type={type} onChange={updateValue} />
    )
  }
}

const TextInputModule = getSimpleTextModule('input', 'text')
const TextAreaModule = getSimpleTextModule('textarea')
const NumberInputModule = getSimpleTextModule('input', 'number')
const DateInputModule = getSimpleTextModule('input', 'date')

function getSearchQueryModule (type) {
  return function (props) {
    const [value, setValue] = useState(props.value || '')

    function updateValue (id) {
      setValue(id)
      props.passValue(id)
    }

    return (
      <QueryInput cls={type} passInfo={updateValue} id={value} />
    )
  }
}

function getOptionSelectModule (args) {
  return function (props) {
    const [value, setValue] = useState(props.values)

    const options = args.map((arg, i) => {
      const value = arg.match(/(?<=\[\s*)\w+/)[0]
      const text = arg.match(/(?<=").*(?=")/)[0]
      return <option key={i} value={value}>{text}</option>
    })

    function handleChange (e) {
      const { value } = e.target
      setValue(value)
      props.passValue(value || null)
    }

    return (
      <select value={value} onChange={handleChange}>
        <option value='' />
        {options}
      </select>
    )
  }
}

function CheckboxModule (props) {
  const [value, setValue] = useState(typeof props.value === 'boolean' ? props.value : null)

  function handleChange (e) {
    const { checked } = e.target
    setValue(checked)
    props.passValue(checked)
  }

  return (
    <input type='checkbox' checked={value || false} onChange={handleChange} />
  )
}

function MusicFileModule (props) {
  const [value, setValue] = useState(props.value || '')
  const [filenames, setFilenames] = useState('')

  useEffect(() => {
    if (!isNaN(value)) {
      (async () => {
        if (value !== '') {
          const names = (await postAndGetJSON('api/get', { id: Number(value), cls: 'file' })).data
        }
      })()
    }
  }, [value])

  function passValue (id) {
    setValue(id)
  }

  const SearchQuery = getSearchQueryModule('file')

  let MusicFile

  if (!filenames) {
    MusicFile = () => (
      <div>
        Pick a file in order to play it
      </div>
    )
  } else {
    let extension = filenames.originalname.match(/\.(.*?)$/)
    // in case there is no match
    if (extension) extension = extension[1]

    const validExtensions = [
      'mp3',
      'wav',
      'flac',
      'm4a',
      'ogg'
    ]

    if (extension && validExtensions.includes(extension)) {
      MusicFile = () => (
        <audio src={`/${filenames.filename}`} />
      )
    } else {
      MusicFile = () => (
        <div>
          Unsupported audio format
        </div>
      )
    }
  }

  return (
    <div>
      <SearchQuery value={value} passValue={passValue} />
      <MusicFile />
    </div>
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
          <props.component passValue={passValue} value={element} declrs={props.declrs} />
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
        declr.Component = {
          TEXTLONG: TextAreaModule,
          INT: NumberInputModule,
          ID: getSearchQueryModule(args),
          SELECT: getOptionSelectModule(args),
          DATE: DateInputModule,
          BOOLEAN: CheckboxModule,
          FILE: MusicFileModule
        }[type] || TextInputModule
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

  async function submitData () {
    if (window.confirm('Submit data?')) {
      const row = { ...props.args.row }
      row.data = data
      const token = getCookies().session
      const payload = {
        cls: props.args.editorData.cls,
        row,
        token
      }
      const response = await postJSON('api/update', payload)
      if (response.status === 200) {
        window.alert('Data submitted with success')
        window.location.href = '/Special:Editor'
      } else if (response.status === 400) {
        const errors = (await response.json()).errors
        window.alert(`There is a mistake in your submission\n${errors}`)
      } else if (response.status === 403) {
        window.alert("You don't have permission to do that")
      }
    }
  }

  return (
    <div className='editor--container'>
      <TableModule className='editor' declrs={declrs} value={data} passValue={setData} />
      <div className='submit--container'>
        <button className='blue-button' onClick={submitData}>
          SUBMIT
        </button>
      </div>
    </div>
  )
}
