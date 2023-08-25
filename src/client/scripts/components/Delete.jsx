import React, { useState } from 'react'
import '../../stylesheets/delete.css'
import { getCookies, postJSON } from '../client-utils'
import { getName } from '../../../server/misc/common-utils'
import EditorHeader from './EditorHeader'

function ReferenceWarning (props) {
  const components = props.refs.map((ref, i) => {
    const [cls, name] = ref
    return (
      <li key={i}>
        {cls} - {name}
      </li>
    )
  })

  return (
    <div className='reference-warning'>
      <div className='bold'>This item cannot be deleted because it is referenced in the following places:</div>
      <ul>
        {components}
      </ul>
    </div>
  )
}

export default function Delete (props) {
  const [reason, setReason] = useState(0)
  const [other, setOther] = useState('')

  function handleSelect (e) {
    setReason(e.target.value)
  }

  function handleInput (e) {
    setOther(e.target.value)
  }

  async function clickDelete () {
    const token = getCookies().session
    await postJSON('api/delete', { cls: props.arg.deleteData.cls, id: Number(props.arg.row.id), token, reason, otherReason: other })
    window.alert('Item deleted')
    window.location.href = '/Special:Items'
  }

  const header = (
    <EditorHeader cur={4} isStatic={false} id={props.arg.row.id} name={getName(props.arg.row.querywords)} cls={props.arg.deleteData.cls} t={props.arg.deleteData.t} />
  )

  if (props.arg.deleteData.refs.length !== 0) {
    return (
      <div>
        {header}
        <ReferenceWarning refs={props.arg.deleteData.refs} />
      </div>
    )
  } else {
    return (
      <div>
        {header}
        <div className='bold'> Warning: The item you are about to delete has a history with n revisions </div>
        <div className='delete--explanation'>
          You are about to delete "{getName(props.arg.row.querywords)}", which will exclude the item from anything inside the wiki. This action can be undone at any time by an admin.
        </div>
        <div className='delete--box'>
          <div className='bold delete--delete'>Delete</div>
          <div className='delete--reason'>
            <span>Reason:</span>
            <select value={reason} onChange={handleSelect}>
              <option value={0}>Other reason</option>
              <option value={1}>Spam</option>
              <option value={2}>Vandalism</option>
            </select>
          </div>
          <div className='delete--reason'>
            <span>Other/additional reason:</span>
            <input type='text' value={other} onChange={handleInput} />
          </div>
          <div className='delete--watch'>
            <input type='checkbox' />
            <span>Watch this page</span>
          </div>
          <button className='red-button delete--button' onClick={clickDelete}>
            Delete page
          </button>
        </div>
        <div className='deletion-log'>
          <div className='page-title'>Deletion log</div>
          <div>
            ...
          </div>
        </div>
      </div>
    )
  }
}
