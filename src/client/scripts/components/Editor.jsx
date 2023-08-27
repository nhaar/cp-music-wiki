import React, { useContext, useEffect, useState } from 'react'

import '../../stylesheets/editor.css'
import QueryInput from './QueryInput'
import { getCookies, postAndGetJSON, postJSON } from '../client-utils'
import { ItemContext } from '../contexts/ItemContext'
import { EditorContext } from '../contexts/EditorContext'
import QuestionMark from '../../images/question-mark.png'
import EditorHeader from './EditorHeader'
import { getName } from '../../../server/misc/common-utils'
import { FullscreenContext } from '../contexts/FullscreenContext'
import FourArrows from '../../images/four-corner-arrows.png'
// element modules
// array modules
// editor module

function getAlternatingClass (path) {
  return path.filter(e => typeof e === 'string').length % 2 === 1
    ? 'alternate-layer'
    : 'white-bg'
}

function getSimpleTextModule (Tag, type) {
  return function (props) {
    const getValue = value => value || ''
    const [value, setValue] = useState(() => getValue(props.value))
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    useEffect(() => {
      setValue(getValue(props.value))
    }, [props.value])

    function updateValue (e) {
      const { value } = e.target
      setValue(value)
      updateData(props.path, type !== 'number' ? value : Number(value) || null)
    }

    return (
      <Tag value={value} type={type} onChange={updateValue} readOnly={!isEditor} />
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
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    function updateValue (id) {
      setValue(id)
      updateData(props.path, Number(id))
    }

    return (
      <QueryInput cls={type} passInfo={updateValue} id={value} readonly={!isEditor} />
    )
  }
}

function getOptionSelectModule (args) {
  return function (props) {
    const [value, setValue] = useState(props.value || '')
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    const options = args.map((arg, i) => {
      const value = arg.match(/(?<=\[\s*)\w+/)[0]
      const text = arg.match(/(?<=").*(?=")/)[0]
      return <option key={i} value={value}>{text}</option>
    })

    function handleChange (e) {
      const { value } = e.target
      setValue(value)
      updateData(props.path, value || null)
    }

    return (
      <select value={value} onChange={isEditor && handleChange}>
        <option value='' />
        {options}
      </select>
    )
  }
}

function CheckboxModule (props) {
  const [value, setValue] = useState(typeof props.value === 'boolean' ? props.value : null)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)

  function handleChange (e) {
    const { checked } = e.target
    setValue(checked)
    updateData(props.path, checked)
  }

  return (
    <input
      type='checkbox'
      checked={value || false}
      onChange={handleChange}
      readOnly={!isEditor}
      style={{
        alignSelf: 'center',
        height: '30px',
        width: '30px',
        cursor: 'pointer'
      }}
    />
  )
}

function MusicFileModule (props) {
  const [filenames, setFilenames] = useState('')

  useEffect(() => {
    if (props.value !== null) {
      (async () => {
        const names = (await postAndGetJSON('api/get', { id: Number(props.value), cls: 'file' })).data
        if (names.filename !== filenames.filename) setFilenames(names)
      })()
    }
  })

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
      <SearchQuery value={props.value} path={props.path} />
      <MusicFile />
    </div>
  )
}

function GridRowModule (props) {
  const [grid, setGrid] = useState(() => {
    if (props.value) {
      let k = 0
      return props.value.map(row => row.map(cell => {
        k++
        return { id: k, value: cell }
      }))
    } else return []
  })
  const [rows, setRows] = useState(props.value.length || 0)
  const [columns, setColumns] = useState(() => {
    let columns = 0
    if (props.value) {
      props.value.forEach(element => {
        if (element.length > columns) columns = element.length
      })
    }

    return columns
  })
  const [isMoving, setIsMoving] = useState(false)
  const [originalPos, setOriginalPos] = useState(-1)
  const [seq, setSeq] = useState(columns * rows + 1)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)

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

  function setData (callback) {
    const newG = callback(grid)

    updateData(props.path, newG.map(row => row.map(element => element.value)))
    setGrid(newG)
  }

  function stopMoving (k) {
    return () => {
      if (isMoving) {
        const [x, y] = getCoords(k)
        const valueInPos = grid[x][y]
        const [i, j] = getCoords(originalPos)
        setData(g => {
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
      setData(g => {
        const newG = [...g]
        newG.splice(newG.length - 1, 1)
        setRows(r => r - 1)
        return newG
      })
    }
  }

  function removeColumn () {
    if (columns > 1) {
      setData(g => {
        const newG = [...g]
        newG.forEach(row => {
          row.splice(row.length - 1, 1)
        })
        setColumns(c => c - 1)
        return newG
      })
    }
  }

  function getDefaultValue () {
    let value = null
    if (props.declrs) {
      value = getDefault(props)
    }
    return value
  }

  function addRow () {
    const curCol = columns || 1
    if (columns === 0) {
      setColumns(1)
    }
    const row = []
    for (let i = 0; i < curCol; i++) {
      row.push({ id: seq + i, value: getDefaultValue() })
    }
    setData(g => {
      const newG = [...g]
      newG.push(row)
      setRows(r => r + 1)
      setSeq(s => s + curCol)
      return newG
    })
  }

  function addColumn () {
    if (rows === 0) {
      addRow()
    } else {
      setData(g => {
        const newG = [...g]
        for (let i = 0; i < rows; i++) {
          newG[i].push({ id: seq + i, value: getDefaultValue() })
        }

        setColumns(c => c + 1)
        setSeq(s => s + rows)
        return newG
      })
    }
  }

  function getCoords (k) {
    return [Math.floor(k / columns), k % rows]
  }

  const components = values.map((element, k) => {
    const [i, j] = getCoords(k)
    const path = [...props.path, i, j]
    return (
      <div key={element.id}>
        <div onMouseUp={stopMoving(k)}>
          <props.component value={element.value} declrs={props.declrs} path={path} />
          {isEditor && <button onMouseDown={startMoving(k)}> Move </button>}
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
  const [array, setArray] = useState(() => {
    if (props.value) {
      return props.value.map((element, i) => ({ id: i, value: element }))
    } else {
      return []
    }
  })
  const [seq, setSeq] = useState(() => props.value ? props.value.length : 0)
  const [fullscreenPath] = useContext(FullscreenContext)

  const [isMoving, setIsMoving] = useState(false)
  const [currentHover, setCurrentHover] = useState(-1)
  const [originalPos, setOriginalPos] = useState(-1)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)

  function setData (callback) {
    const newA = callback(array)
    updateData(props.path, newA.map(item => item.value))
    setArray(newA)
  }

  function deleteRow (i) {
    return () => {
      setData(a => {
        const newA = [...a]
        newA.splice(i, 1)
        return newA
      })
    }
  }

  function addRow () {
    let newValue = null
    if (props.declrs) {
      newValue = getDefault(props)
    }

    const nextSeq = seq + 1
    setSeq(nextSeq)
    setData(a => [...a, { id: seq, value: newValue }])
  }

  function clickMove (i) {
    return () => {
      setIsMoving(true)
      setOriginalPos(i)
      setCurrentHover(i)
    }
  }

  function finishMove (i) {
    return () => {
      if (isMoving) {
        setData(a => {
          const newA = [...a]
          const removed = newA.splice(originalPos, 1)
          newA.splice(i, 0, ...removed)
          setIsMoving(false)
          return newA
        })
      }
    }
  }

  function hoverOver (i) {
    return () => {
      if (isMoving) setCurrentHover(i)
    }
  }

  const showRowElements = !fullscreenPath || (pathIncludes(fullscreenPath, props.path) && fullscreenPath.length <= props.path.length)

  const components = array.map((element, i) => {
    const path = [...props.path, i]

    return (
      <div
        key={i}
        style={{
          position: 'relative',
          padding: '0 -2px'
        }}
        onMouseUp={finishMove(i)} onMouseOver={hoverOver(i)} onMouseOut={() => { setCurrentHover(-1) }}
      >
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: '0',
            top: '0',
            zIndex: '100',
            pointerEvents: 'none'
          }}
          className={currentHover === i && isMoving ? 'blue-overlay' : ''}
        />
        <div key={element.id}>
          {showRowElements
            ? (
              <div
                className={getAlternatingClass(props.path)} style={{
                  border: '1px solid gray',
                  borderBottom: '0',
                  display: 'flex',
                  columnGap: '2px',
                  padding: '10px',
                  alignItems: 'center'
                }}
              >
                <span
                  className='standard-border' style={{
                    marginLeft: '30px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'black',
                    color: 'white',
                    padding: '5px',
                    borderRadius: 0,
                    boxSizing: 'border-box',
                    cursor: 'default'
                  }}
                > Row #{i + 1}
                </span>
                {isEditor && (
                  <button
                    className={`blue-button ${isMoving ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onMouseDown={clickMove(i)}
                    style={{
                      borderRadius: '0'
                    }}
                  >
                    MOVE
                  </button>
                )}

                {isEditor && (
                  <button
                    onClick={deleteRow(i)} className='red-button' style={{
                      borderRadius: '0'
                    }}
                  >
                    DELETE
                  </button>
                )}
              </div>
              )
            : (
                undefined
              )}

          <props.component value={element.value} declrs={props.declrs} path={path} />

        </div>
      </div>
    )
  })

  return (
    <div className='moveable-module'>
      {components}
      {isEditor && showRowElements && (
        <button onClick={addRow} className='blue-button'>
          ADD
        </button>
      )}
    </div>
  )
}

function getDefault (props) {
  const defaultValue = {}
  props.declrs.forEach(declr => {
    let value = null
    if (declr.declrs) {
      value = getDefault(declr)
    }
    defaultValue[declr.property] = value
  })
  return defaultValue
}

function TableModule (props) {
  const [value] = useState(() => props.value)
  const [fullscreenPath, setFullscreenPath] = useContext(FullscreenContext)

  const components = []
  props.declrs.forEach((declr, i) => {
    const path = [...props.path, declr.property]

    let childValue = value[declr.property]
    if (!childValue && declr.declrs) {
      childValue = getDefault(declr)
    }

    const mainComponent = (
      <declr.Component
        value={childValue}
        component={declr.component}
        declrs={declr.declrs}
        path={path}
      />
    )

    if (!fullscreenPath || (pathIncludes(fullscreenPath, path) && fullscreenPath.length <= path.length)) {
      components.push((
        <div
          key={i} className={`table-row ${getAlternatingClass(props.path)}`}
        >
          <div
            className='header--container'
            onClick={clickHeader}
          >
            <div className='header--title'>{declr.header}</div>
            <img src={FourArrows} className='four-arrows' onClick={clickHeader(path)} />
            <img src={QuestionMark} className='question-mark' title={declr.desc} />
          </div>
          {mainComponent}
        </div>
      ))
    } else if ((fullscreenPath && pathIncludes(fullscreenPath, path))) {
      components.push((
        <div>
          {mainComponent}
        </div>
      ))
    }
  })

  function clickHeader (path) {
    return () => {
      if (fullscreenPath) {
        setFullscreenPath(undefined)
      } else {
        setFullscreenPath(path)
      }
    }
  }

  return (
    <div className='table-module'>
      {components}
    </div>
  )
}

export default function Editor (props) {
  const [data, setData] = useState(props.arg.row.data)
  const [fullscreenPath, setFullscreenPath] = useState(undefined)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [isEditor] = useState(props.editor !== false)

  const iterate = (obj) => {
    const declrs = []

    for (const property in obj) {
      const declr = {}
      const [fullType, header, desc, args] = obj[property]
      declr.property = property
      declr.header = header
      declr.desc = desc

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

  const declrs = iterate(props.arg.editorData.main)

  function updateData (path, value) {
    const root = { ...data }
    let obj = root
    path.forEach((step, i) => {
      if (i === path.length - 1) {
        obj[step] = value
      } else {
        obj = obj[step]
      }
    })

    if (hasUnsaved === false) setHasUnsaved(true)
    setData(root)
  }

  if (isEditor && hasUnsaved) {
    setHasUnsaved(undefined)
    window.onbeforeunload = () => ''
  }

  const name = getName(props.arg.row.querywords)

  return (
    <div className='editor--container'>
      <EditorHeader cur={isEditor ? 1 : 0} isStatic={props.arg.editorData.isStatic} id={props.arg.row.id} name={name} cls={props.arg.editorData.cls} deleted={props.arg.isDeleted} predefined={props.arg.row.predefined} />
      <FullscreenContext.Provider value={[fullscreenPath, setFullscreenPath]}>
        <EditorContext.Provider value={isEditor}>
          <ItemContext.Provider value={updateData}>
            <div className='editor'>
              <TableModule declrs={declrs} value={data} path={[]} />
            </div>
          </ItemContext.Provider>
        </EditorContext.Provider>
      </FullscreenContext.Provider>
      {isEditor && <SubmitOptions row={props.arg.row} cls={props.arg.editorData.cls} data={data} />}
    </div>
  )
}

function SubmitOptions (props) {
  const [isMinor, setIsMinor] = useState(false)

  function handleMinorChange (e) {
    setIsMinor(e.target.checked)
  }

  async function submitData () {
    if (window.confirm('Submit data?')) {
      const row = { ...props.row }
      row.data = props.data
      const token = getCookies().session
      const payload = {
        cls: props.cls,
        row,
        token,
        isMinor
      }
      const response = await postJSON('api/update', payload)
      if (response.status === 200) {
        window.alert('Data submitted with success')
        window.location.href = '/Special:Items'
      } else if (response.status === 400) {
        const errors = (await response.json()).errors
        window.alert(`There is a mistake in your submission\n${errors}`)
      } else if (response.status === 403) {
        window.alert("You don't have permission to do that")
      }
    }
  }

  return (

    <div className='submit--container'>
      <div className='submit--summary'>
        <span>Summary:</span>
        <input type='text' />
      </div>

      <div className='submit--options'>
        <input type='checkbox' checked={isMinor} onChange={handleMinorChange} />
        <span>This is a minor edit</span>
        <input type='checkbox' />
        <span>Watch this page</span>
        <select>
          <option>Permanent</option>
          <option>1 week</option>
          <option>1 month</option>
          <option>3 months</option>
          <option>6 months</option>
        </select>
      </div>
      <div className='submit--buttons'>
        <button className='blue-button' onClick={submitData}>
          Save changes
        </button>
        <button>
          Show changes
        </button>
        <button className='cancel-button'>
          Cancel
        </button>
      </div>
    </div>
  )
}

function pathIncludes (fullPath, curPath) {
  for (let i = 0; i < Math.min(curPath.length, fullPath.length); i++) {
    if (fullPath[i] !== curPath[i]) {
      return false
    }
  }

  return true
}
