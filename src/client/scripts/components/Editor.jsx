import React, { useContext, useEffect, useState } from 'react'

import '../../stylesheets/editor.css'
import QueryInput from './QueryInput'
import { getCookies, postAndGetJSON, postJSON } from '../client-utils'
import { ItemContext } from '../contexts/ItemContext'
import { EditorContext } from '../contexts/EditorContext'
import QuestionMark from '../../images/question-mark.png'
import Focus from '../../images/anti-fullscreen.png'
import EditorHeader from './EditorHeader'
import { FullscreenContext } from '../contexts/FullscreenContext'
import Unfocus from '../../images/four-corner-arrows.png'
import { EditorDataContext } from '../contexts/EditorDataContext'

/**
 * All the `Declrs` that correspond to a table module's children modules
 * @typedef {Declr[]} DeclrList
 */

/**
 * An object that contains information for a child module of a table module
 * @typedef {object} Declr
 * @property {Component} Component - Module to be used by the child
 * @property {ComponentClass} component - If the module is an array of modules, this is the module to be used by the children of the array
 * @property {DeclrList} declrs - If either `Component` or `component` are table modules, this is the `DeclrList` to be used in that table module
 */

/**
 * Get what the background color of a nested table member should be
 * @param {string[]} path - Path to this table member
 * @returns {string} `CSS` class name to assign to the component
 */
function getAlternatingClass (path) {
  return path.filter(e => typeof e === 'string').length % 2 === 1
    ? 'alternate-layer'
    : 'white-bg'
}

/** Component that represents a module with only text in it */
function getSimpleTextModule (Tag, type) {
  return function ({ value, path }) {
    const getValue = value => value || ''
    const [newValue, setNewValue] = useState(() => getValue(value))
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    useEffect(() => {
      setNewValue(getValue(value))
    }, [value])

    function updateValue (e) {
      const { value } = e.target
      setNewValue(value)
      updateData(path, type !== 'number' ? value : Number(value) || null)
    }

    return (
      <Tag value={newValue} type={type} onChange={updateValue} readOnly={!isEditor} />
    )
  }
}

/** Component for a module that represents short text */
const TextInputModule = getSimpleTextModule('input', 'text')

/** Component for a module that represents long text */
const TextAreaModule = getSimpleTextModule('textarea')

/** Component for a module that represents a number */
const NumberInputModule = getSimpleTextModule('input', 'number')

/** Component for a module that represents a date */
const DateInputModule = getSimpleTextModule('input', 'date')

/** Component for a module that represents an item's id */
function getSearchQueryModule (type) {
  return function ({ value, path }) {
    const [id, setId] = useState(value || '')
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    function updateValue (id) {
      setId(id)
      updateData(path, Number(id))
    }

    return (
      <QueryInput cls={type} passInfo={updateValue} id={id} readonly={!isEditor} />
    )
  }
}

/** Component for a module that represents a select */
function getOptionSelectModule (args) {
  return function ({ value, path }) {
    const [selectValue, setSelectValue] = useState(value || '')
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    const options = args.map((arg, i) => {
      const value = arg.match(/(?<=\[\s*)\w+/)[0]
      const text = arg.match(/(?<=").*(?=")/)[0]
      return <option key={i} value={value}>{text}</option>
    })

    function handleChange (e) {
      const { value } = e.target
      setSelectValue(selectValue)
      updateData(path, value || null)
    }

    return (
      <select value={selectValue} onChange={isEditor && handleChange}>
        <option value='' />
        {options}
      </select>
    )
  }
}

/** Component for a module that represents a boolean */
function CheckboxModule ({ value, path }) {
  const [checked, setChecked] = useState(typeof value === 'boolean' ? value : null)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)

  function handleChange (e) {
    const { checked } = e.target
    setChecked(checked)
    updateData(path, checked)
  }

  return (
    <input
      type='checkbox'
      checked={checked || false}
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

/** Component for a module that represents a music file */
function MusicFileModule ({ value, path }) {
  const [filenames, setFilenames] = useState('')

  useEffect(() => {
    if (value !== null) {
      (async () => {
        const names = (await postAndGetJSON('api/get', { id: Number(value), cls: 'file' })).data
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
      <SearchQuery {...{ value, path }} />
      <MusicFile />
    </div>
  )
}

/** Component for a module that represents a two-dimensional array, that lets it be displayed as a grid */
function GridRowModule ({ value, Component, declrs, path }) {
  const [grid, setGrid] = useState(() => {
    if (value) {
      let k = 0
      return value.map(row => row.map(cell => {
        k++
        return { id: k, value: cell }
      }))
    } else return []
  })
  const [rows, setRows] = useState(value.length || 0)
  const [columns, setColumns] = useState(() => {
    let columns = 0
    if (value) {
      value.forEach(element => {
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

    updateData(path, newG.map(row => row.map(element => element.value)))
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
    if (declrs) {
      value = getDefault(declrs)
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
    const thisPath = [...path, i, j]
    return (
      <div key={element.id}>
        <div onMouseUp={stopMoving(k)}>
          <Component {...{ value: element.value, declrs, path: thisPath }} />
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

/**
 * Component for a module that represents a one-dimensional array, that lets the elements of the array be displayed
 * as moveable rows
 */
function MoveableRowsModule ({ value, Component, declrs, path }) {
  const [array, setArray] = useState(() => {
    if (value) {
      return value.map((element, i) => ({ id: i, value: element }))
    } else {
      return []
    }
  })
  const [seq, setSeq] = useState(() => value ? value.length : 0)
  const [fullscreenPath] = useContext(FullscreenContext)

  const [isMoving, setIsMoving] = useState(false)
  const [currentHover, setCurrentHover] = useState(-1)
  const [originalPos, setOriginalPos] = useState(-1)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)

  function setData (callback) {
    const newA = callback(array)
    updateData(path, newA.map(item => item.value))
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
    if (declrs) {
      newValue = getDefault(declrs)
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

  const showRowElements = !fullscreenPath || (pathIncludes(fullscreenPath, path) && fullscreenPath.length <= path.length)

  const components = array.map((element, i) => {
    const thisPath = [...path, i]

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
                className={getAlternatingClass(thisPath)} style={{
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
                    background: 'rgb(230, 230, 230, 0.2)',
                    color: 'black',
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

          <Component {...{ value: element.value, declrs, path: thisPath }} />

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

/**
 * Get a default `data` object based on a `DeclrList`
 * @param {DeclrList} declrs - Children modules
 * @returns {object} Default `data` object
 */
function getDefault (declrs) {
  const defaultValue = {}
  declrs.forEach(declr => {
    let value = null
    if (declr.declrs) {
      value = getDefault(declr.declrs)
    }
    defaultValue[declr.property] = value
  })
  return defaultValue
}

/** Component for a module that represents an object, containing a map of "keys" (names) to "values" (other modules) */
function TableModule ({ declrs, value, path }) {
  const [fullscreenPath, setFullscreenPath] = useContext(FullscreenContext)
  const structure = useContext(EditorDataContext)

  const components = []
  declrs.forEach((declr, i) => {
    const thisPath = [...path, declr.property]

    let childValue = value[declr.property]
    if (!childValue && declr.declrs) {
      childValue = getDefault(declr)
    }

    const mainComponent = (
      <declr.Component
        {...{ value: childValue, Component: declr.component, declrs: declr.declrs, path: thisPath }}
      />
    )

    // add path displayer if at the exact start
    if (fullscreenPath && pathIncludes(fullscreenPath, thisPath) && fullscreenPath.length === path.length) {
      const prettyPath = []
      let curStructure = structure

      thisPath.forEach(step => {
        if (typeof step === 'number') {
          prettyPath.push(`Row #${step + 1}`)
        } else {
          prettyPath.push(curStructure[step].name)
          curStructure = curStructure[step].content
        }
      })

      components.push((
        <div
          key={i}
          className='standard-border' style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            marginBottom: '10px',
            userSelect: 'none'
          }}
        >
          <img
            src={Unfocus} style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
            onClick={() => setFullscreenPath(undefined)}
          />
          <div style={{
            color: 'gray',
            fontSize: '10px'
          }}
          >
            Exit focus mode
          </div>
        </div>
      ))
      components.push((
        <div
          key={`-${i}`}
          className='standard-border flex-column' style={{
            fontStyle: 'italic',
            padding: '10px',
            marginBottom: '10px'
          }}
        >
          <div style={{
            borderBottom: '1px solid gray',
            paddingBottom: '10px',
            marginBottom: '10px'
          }}
          >
            Focused on the path
          </div>
          <div style={{
            display: 'flex'
          }}
          >

            {prettyPath.map((step, i) => (
              <div
                key={i} style={{
                  display: 'flex'
                }}
              >
                <div style={{
                  marginRight: '20px'
                }}
                >
                  {step}
                </div>

                {i < prettyPath.length - 1
                  ? (
                    <span style={{
                      marginRight: '20px'
                    }}
                    >=&#62;
                    </span>
                    )
                  : ''}
              </div>
            ))}
          </div>
        </div>
      ))
    }

    if (!fullscreenPath || (pathIncludes(fullscreenPath, thisPath) && fullscreenPath.length <= thisPath.length)) {
      components.push((
        <div
          key={`+${i}`} className={`table-row ${getAlternatingClass(path)}`}
        >
          <div
            className='header--container'
            onClick={clickHeader}
          >
            <div className='header--title'>{declr.name}</div>
            {!fullscreenPath && <img src={Focus} className='four-arrows' onClick={clickHeader(thisPath)} />}
            <img src={QuestionMark} className='question-mark' title={declr.desc} />
          </div>
          {mainComponent}
        </div>
      ))
    } else if ((fullscreenPath && pathIncludes(fullscreenPath, thisPath))) {
      components.push((
        <div key={i}>
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

/** Component for the reader and editor page */
export default function Editor ({ editor, structure, isStatic, row, isDeleted, n }) {
  const [data, setData] = useState(row.data)
  const [fullscreenPath, setFullscreenPath] = useState(undefined)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [isEditor] = useState(editor !== false)

  const iterate = (obj) => {
    const declrs = []

    for (const property in obj) {
      const prop = obj[property]
      const declr = { ...prop }

      if (prop.object) {
        declr.Component = TableModule
        declr.declrs = iterate(prop.content)
      } else {
        declr.Component = {
          TEXTLONG: TextAreaModule,
          INT: NumberInputModule,
          ID: getSearchQueryModule(prop.args),
          SELECT: getOptionSelectModule(prop.args),
          DATE: DateInputModule,
          BOOLEAN: CheckboxModule,
          FILE: MusicFileModule
        }[prop.content] || TextInputModule
      }

      if (prop.array) {
        declr.component = declr.Component
        declr.Component = prop.dim === 1 ? MoveableRowsModule : GridRowModule
      }

      declrs.push(declr)
    }

    return declrs
  }

  const declrs = iterate(structure)

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

  return (
    <div className='editor--container'>
      <EditorHeader cur={isEditor ? 1 : 0} {...{ isStatic, id: row.id, deleted: isDeleted, predefined: row.predefined, n }} />
      <EditorDataContext.Provider value={structure}>
        <FullscreenContext.Provider value={[fullscreenPath, setFullscreenPath]}>
          <EditorContext.Provider value={isEditor}>
            <ItemContext.Provider value={updateData}>
              <div className='editor'>
                <TableModule {...{ declrs, value: data, path: [] }} />
              </div>
            </ItemContext.Provider>
          </EditorContext.Provider>
        </FullscreenContext.Provider>
      </EditorDataContext.Provider>
      {isEditor && <SubmitOptions {...{ row, data, unsaved: hasUnsaved }} />}
    </div>
  )
}

function SubmitOptions ({ row, data, unsaved }) {
  const [isMinor, setIsMinor] = useState(false)

  function handleMinorChange (e) {
    setIsMinor(e.target.checked)
  }

  async function submitData () {
    if (unsaved !== false) {
      if (window.confirm('Submit data?')) {
        const thisRow = { ...row }
        thisRow.data = data
        const token = getCookies().session
        const payload = {
          cls: row.cls,
          row: thisRow,
          token,
          isMinor
        }
        const response = await postJSON('api/update', payload)
        if (response.status === 200) {
          window.alert('Data submitted with success')
          // remove unsaved changes blocker
          window.onbeforeunload = undefined
          window.location.href = '/Special:Items'
        } else if (response.status === 400) {
          const errors = (await response.json()).errors
          window.alert(`There is a mistake in your submission\n${errors}`)
        } else if (response.status === 403) {
          window.alert("You don't have permission to do that")
        }
      }
    } else {
      window.alert("You haven't done any changes to this item")
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
