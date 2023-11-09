import React, { useState } from 'react'

import '../../stylesheets/editor.css'
import { getCheckedChangeHandler, getCookies, getValueChangeHandler, postJSON } from '../client-utils'
import { ItemContext } from '../contexts/ItemContext'
import { EditorContext } from '../contexts/EditorContext'
import EditorHeader from './EditorHeader'
import { FullscreenContext } from '../contexts/FullscreenContext'
import { EditorDataContext } from '../contexts/EditorDataContext'
import { AdminContext } from '../contexts/AdminContext'
import { AnyoneContext } from '../contexts/AnyoneContext'
import { TableModule, addComponentsToDeclarations } from './EditorComponents'
import { UseFullscreenContext } from '../contexts/UseFullscreenContext'

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

/** Component for the reader and editor page */
export default function Editor ({ editor, structure, isStatic, row, isDeleted, n, isAdmin, watching }) {
  const [data, setData] = useState(row.data)
  const [fullscreenPath, setFullscreenPath] = useState(undefined)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [isEditor] = useState(editor !== false)

  const declrs = addComponentsToDeclarations(structure)

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
      <EditorHeader
        cur={isEditor ? 1 : 0} {...{
          isStatic,
          id: row.id,
          deleted: isDeleted,
          predefined: row.predefined,
          n,
          watching
        }}
      />
      <UseFullscreenContext.Provider value>
        <AnyoneContext.Provider value={false}>
          <AdminContext.Provider value={isAdmin}>
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
          </AdminContext.Provider>
        </AnyoneContext.Provider>
      </UseFullscreenContext.Provider>
      {isEditor && <SubmitOptions {...{ row, data, unsaved: hasUnsaved }} />}
    </div>
  )
}

function SubmitOptions ({ row, data, unsaved }) {
  const [isMinor, setIsMinor] = useState(false)
  const [watch, setWatch] = useState(true)
  const [selectVal, setSelectVal] = useState(0)

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
          isMinor,
          watchDays: watch ? selectVal : undefined
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
        <input type='checkbox' checked={isMinor} onChange={getCheckedChangeHandler(setIsMinor)} />
        <span>This is a minor edit</span>
        <input type='checkbox' checked={watch} onChange={getCheckedChangeHandler(setWatch)} />
        <span>Watch this page</span>
        <select value={selectVal} onChange={getValueChangeHandler(setSelectVal)}>
          <option value={0}>Permanent</option>
          <option value={7}>1 week</option>
          <option value={30}>1 month</option>
          <option value={91}>3 months</option>
          <option value={183}>6 months</option>
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
