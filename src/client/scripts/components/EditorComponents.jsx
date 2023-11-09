import React, { useContext, useEffect, useState } from 'react'

import QueryInput from './QueryInput'
import { AdminContext } from '../contexts/AdminContext'
import { AnyoneContext } from '../contexts/AnyoneContext'
import { EditorContext } from '../contexts/EditorContext'
import { EditorDataContext } from '../contexts/EditorDataContext'
import { FullscreenContext } from '../contexts/FullscreenContext'
import { UseFullscreenContext } from '../contexts/UseFullscreenContext'
import '../../stylesheets/editor.css'
import { findInObject, postAndGetJSON } from '../client-utils'
import { ItemContext } from '../contexts/ItemContext'
import QuestionMark from '../../images/question-mark.png'
import Focus from '../../images/anti-fullscreen.png'
import Unfocus from '../../images/four-corner-arrows.png'
import { deepcopy, getUniqueHash } from '../../../server/misc/common-utils'
import ItemMatrix from '../../../server/item-class/item-matrix'

/** Component that represents a module with only text in it */
export function getSimpleTextModule (Tag, type) {
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

    // avoiding being too small in nested tables
    const width = type === 'date' ? '150px' : '100%'

    return (
      <Tag
        value={newValue} type={type} onChange={updateValue} readOnly={!isEditor} style={{
          minWidth: width
        }}
      />
    )
  }
}

/** Component for a module that represents short text */
export const TextInputModule = getSimpleTextModule('input', 'text')

/** Component for a module that represents long text */
export const TextAreaModule = getSimpleTextModule('textarea')

/** Component for a module that represents a number */
export const NumberInputModule = getSimpleTextModule('input', 'number')

/** Component for a module that represents a date */
export const DateInputModule = getSimpleTextModule('input', 'date')

/**
 * Get a search query for the ids of a given class
 * @param {string} cls - Class name
 * @returns {Component} `QueryInput` for the class
 */
export function getSearchQueryModule (cls) {
  return function ({ value, path }) {
    const [id, setId] = useState(value || '')
    const updateData = useContext(ItemContext)
    const isEditor = useContext(EditorContext)

    function updateValue (id) {
      setId(id)
      updateData(path, Number(id))
    }

    return (
      <QueryInput cls={cls} passInfo={updateValue} id={id} readonly={!isEditor} />
    )
  }
}

/** Component for a module that represents a select */
export function getOptionSelectModule (args) {
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
export function CheckboxModule ({ value, path }) {
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
export function MusicFileModule ({ value, path }) {
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
export function GridRowModule ({ value, Component, declrs, path }) {
  const [matrix, setMatrix] = useState(() => {
    if (value) {
      const matrix = deepcopy(value)
      return new ItemMatrix(matrix.value, matrix.rows, matrix.columns)
    } else {
      return []
    }
  })
  // const [rows, setRows] = useState(value.length || 0)
  // const [columns, setColumns] = useState(() => {
  //   let columns = 0
  //   if (value) {
  //     value.forEach(element => {
  //       if (element.length > columns) columns = element.length
  //     })
  //   }

  //   return columns
  // })
  const [isMoving, setIsMoving] = useState(false)
  const [originalPos, setOriginalPos] = useState(-1)
  const [currentHover, setCurrentHover] = useState(-1)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)
  const isAdmin = useContext(AdminContext)
  const inAnyone = useContext(AnyoneContext)
  const [fullscreenPath] = useContext(FullscreenContext)

  function startMoving (k) {
    return () => {
      setOriginalPos(k)
      setIsMoving(true)
      setCurrentHover(k)
    }
  }

  function setData (callback) {
    const newM = callback(new ItemMatrix(deepcopy(matrix.value), matrix.rows, matrix.columns))
    updateData(path, newM)
    setMatrix(newM)
  }

  function stopMoving (k) {
    return () => {
      if (isMoving) {
        setIsMoving(false)
        const valueInPos = matrix.value[k]
        setData(m => {
          m.value[k] = m.value[originalPos]
          m.value[originalPos] = valueInPos
          return m
        })
      }
    }
  }

  function removeRow () {
    setData(m => {
      m.removeRow()
      return m
    })
  }

  function removeColumn () {
    setData(m => {
      m.removeColumn()
      return m
    })
  }

  function getDefaultValue () {
    let value = null
    if (declrs) {
      value = getDefault(declrs)
    }
    return value
  }

  function addRow () {
    const row = []
    if (matrix.columns === 0) {
      matrix.columns = 1
    }
    for (let i = 0; i < matrix.columns; i++) {
      row.push({ id: getUniqueHash(), value: getDefaultValue() })
    }
    setData(m => {
      m.addRow(row)
      return m
    })
  }

  function addColumn () {
    setData(m => {
      const total = m.rows === 0 ? 1 : m.rows
      const col = []
      for (let i = 0; i < total; i++) {
        col.push({ id: getUniqueHash(), value: getDefaultValue() })
      }
      m.addColumn(col)
      return m
    })
  }

  function getCoords (k) {
    return [Math.floor(k / matrix.columns), k % matrix.columns]
  }

  const showRowElements = getShowRowElements(fullscreenPath, path)

  const components = matrix.value.map((element, k) => {
    const [i, j] = getCoords(k)
    // because arrays end with an object containing the value
    const thisPath = [...path, 'value', k, 'value']
    return (
      <div
        key={element.id} style={{
          margin: '5px',
          position: 'relative'
        }}
        onMouseOver={hoverOver(k, isMoving, setCurrentHover)}
        onMouseOut={() => setCurrentHover(-1)}
      >
        <div onMouseUp={stopMoving(k)}>
          <Component {...{ value: element.value, declrs, path: thisPath }} />
          {showRowElements && (
            <div
              className='standard-border' style={{
                padding: '10px',
                display: 'flex',
                columnGap: '3px'
              }}
            >
              <span
                className='standard-border row-label'
              >
                Row #{i + 1} | Column #{j + 1}
              </span>
              {(isEditor && (isAdmin || inAnyone)) && <MoveButton onMouseDown={startMoving(k)} isMoving={isMoving} />}
            </div>
          )}

        </div>
        <MoveOverlay {...{ currentHover, i: k, isMoving }} />
      </div>
    )
  })

  // prevent grid structure breaking focus mode
  const style = showRowElements
    ? {
        gridTemplateColumns: `repeat(${matrix.columns}, 1fr)`,
        gridTemplateRows: `repeat(${matrix.rows}, 1fr)`
      }
    : {
        gridTemplateColumns: '1fr'
      }

  return (
    <div
      className='grid-control' style={{
        overflowX: 'scroll'
      }}
    >
      <div className='grid-module' style={style}>
        {components}
      </div>

      {(showRowElements && isEditor) && ((isAdmin || inAnyone)
        ? (
          <div className='grid-buttons'>
            <button onClick={addRow} className='blue-button'>
              + ROW
            </button>
            <button onClick={addColumn} className='blue-button'>
              + COLUMN
            </button>
            <button onClick={removeRow} className='red-button'>
              - ROW
            </button>
            <button onClick={removeColumn} className='red-button'>
              - COLUMN
            </button>
          </div>
          )
        : (
          <div className='perm-warn'>You don't have permission to edit this grid</div>
          ))}
    </div>
  )
}

/** Component for the button used to engage in a drag and drop moving animation for the array modules */
function MoveButton ({ isMoving, onMouseDown }) {
  return (
    <button
      className={`blue-button ${isMoving ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={onMouseDown}
      style={{
        borderRadius: '0'
      }}
    >
      MOVE
    </button>
  )
}

/**
 * Get a function that sets a state variable to a value `i` if a boolean `isMoving` is `true`
 * @param {number} i
 * @param {boolean} isMoving
 * @param {SetStateAction} setter - State's `set` method
 * @returns {function() : void}
 */
function hoverOver (i, isMoving, setter) {
  return () => {
    if (isMoving) setter(i)
  }
}

/**
 * Component for the overlay for the elements containing modules when they are being hovered in drag and drop mode
 * in an array module
 */
function MoveOverlay ({ isMoving, i, currentHover }) {
  return (
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
  )
}

/**
 * Get the `showRowElements` boolean based on the first element of `FullScreenContext`, `fullscreenPath`, and the component's
 * current path, `path`
 * @param {ObjectPath} fullscreenPath
 * @param {ObjectPath} path
 * @returns {boolean} `true` if the row/column elements from an array module should be shown, `false` otherwise
 */
function getShowRowElements (fullscreenPath, path) {
  return !fullscreenPath || (pathIncludes(fullscreenPath, path) && fullscreenPath.length <= path.length)
}

/**
 * Component for a module that represents a one-dimensional array, that lets the elements of the array be displayed
 * as moveable rows
 */
export function MoveableRowsModule ({ value, Component, declrs, path }) {
  const [array, setArray] = useState(() => {
    if (value) {
      // tried using deepcopy, but for some very weird react reason it needs to be destructured
      return [...value]
    } else {
      return []
    }
  })
  const [fullscreenPath] = useContext(FullscreenContext)

  const [isMoving, setIsMoving] = useState(false)
  const [currentHover, setCurrentHover] = useState(-1)
  const [originalPos, setOriginalPos] = useState(-1)
  const updateData = useContext(ItemContext)
  const isEditor = useContext(EditorContext)

  function setData (callback) {
    const newA = callback(array)
    updateData(path, [...newA])
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

    setData(a => [...a, { id: getUniqueHash(), value: newValue }])
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

  // move/add/del works only if editor mode, and then only if is admin or inside tree that anyone can edit
  const hasFunctionality = isEditor && (useContext(AdminContext) || useContext(AnyoneContext))

  const showRowElements = getShowRowElements(fullscreenPath, path)

  const components = array.map((element, i) => {
    const thisPath = [...path, i, 'value']

    return (
      <div
        key={i}
        style={{
          position: 'relative',
          padding: '0 -2px'
        }}
        onMouseUp={finishMove(i)}
        onMouseOver={hoverOver(i, isMoving, setCurrentHover)}
        onMouseOut={() => { setCurrentHover(-1) }}
      >
        <MoveOverlay {...{ isMoving, i, currentHover }} />
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
                  className='standard-border row-label'
                > Row #{i + 1}
                </span>
                {hasFunctionality && (
                  <MoveButton isMoving={isMoving} onMouseDown={clickMove(i)} />
                )}

                {hasFunctionality && (
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
      {(isEditor && showRowElements) && (hasFunctionality
        ? (
          <button onClick={addRow} className='blue-button'>
            ADD
          </button>
          )
        : (
          <div className='perm-warn'>You don't have permission to add to this list</div>
          ))}
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
export function TableModule ({ declrs, value, path }) {
  const [fullscreenPath, setFullscreenPath] = useContext(FullscreenContext)
  const structure = useContext(EditorDataContext)
  const isAdmin = useContext(AdminContext)
  const isEditor = useContext(EditorContext)
  const useFullscreen = useContext(UseFullscreenContext)

  const components = []
  declrs.forEach((declr, i) => {
    const thisPath = [...path, declr.property]

    let childValue = value[declr.property]
    if (!childValue && declr.declrs) {
      childValue = getDefault(declr.declrs)
    }

    // define tree where anyone can edit if a parent (context) has anyone prop or if current prop has it
    const inAnyone = useContext(AnyoneContext) || Boolean(declr.anyone)

    // filter if doesn't have permission
    const mainComponent = (isEditor && (isAdmin || declr.anyone || declr.declrs || inAnyone)) || !isEditor
      ? (
        <AnyoneContext.Provider value={inAnyone}>
          <declr.Component
            {...{ value: childValue, Component: declr.component, declrs: declr.declrs, path: thisPath }}
          />
        </AnyoneContext.Provider>
        )
      : (
        <div className='perm-warn'>You don't have permission to edit this property.</div>
        )

    // add path displayer if at the exact start
    if (fullscreenPath && pathIncludes(fullscreenPath, thisPath) && fullscreenPath.length === thisPath.length) {
      const prettyPath = []
      let curStructure = structure

      thisPath.forEach((step, i) => {
        if (typeof step === 'number') {
          let word = 'Row'
          if (typeof path[i - 1] === 'number') word = 'Column'
          prettyPath.push(`${word} #${step + 1}`)
        } else {
          const propertyObj = findInObject(curStructure, 'property', step)
          prettyPath.push(propertyObj.name)
          curStructure = propertyObj.content
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
          >
            <div className='header--title'>{declr.name}</div>
            {(useFullscreen && !fullscreenPath) && <img src={Focus} className='four-arrows' onClick={clickHeader(thisPath)} />}
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

export function addComponentsToDeclarations (structure) {
  const declrs = []

  for (const property in structure) {
    const prop = structure[property]
    const declr = { ...prop }

    if (prop.object) {
      declr.Component = TableModule
      declr.declrs = addComponentsToDeclarations(prop.content)
    } else {
      declr.Component = {
        TEXTLONG: TextAreaModule,
        INT: NumberInputModule,
        ID: getSearchQueryModule(prop.args && prop.args[0]),
        SELECT: getOptionSelectModule(prop.args && prop.args),
        DATE: DateInputModule,
        BOOLEAN: CheckboxModule,
        FILE: MusicFileModule
      }[prop.content] || TextInputModule
    }

    if (prop.array) {
      declr.component = declr.Component
      declr.Component = prop.matrix ? GridRowModule : MoveableRowsModule
    }

    declrs.push(declr)
  }

  return declrs
}

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

function pathIncludes (fullPath, curPath) {
  for (let i = 0; i < Math.min(curPath.length, fullPath.length); i++) {
    if (fullPath[i] !== curPath[i]) {
      return false
    }
  }

  return true
}
