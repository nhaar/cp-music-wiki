import React, { useState } from 'react'
import '../../stylesheets/undelete.css'
import { postJSON } from '../client-utils'
import EditorHeader from './EditorHeader'

/** Component for the undelete page */
export default function ({ row }) {
  const [reason, setReason] = useState('')

  function handleInput (e) {
    setReason(e.target.value)
  }

  function handleClick () {
    postJSON('api/undelete', { id: row.id, reason })
    window.location.href = '/Special:Items'
  }

  return (
    <div>
      <EditorHeader cur={4} isStatic={false} cls={row.cls} id={row.id} deleted />
      <div className='undelete-box'>
        <div className='bold'>Undelete item</div>
        <div className='undelete--reason-box'>
          <span>Reason:</span>
          <input type='text' value={reason} onChange={handleInput} />
        </div>
        <button className='blue-button' onClick={handleClick}>Undelete</button>
      </div>
    </div>
  )
}
