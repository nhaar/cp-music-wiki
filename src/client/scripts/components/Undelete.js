import React, { useState } from 'react'
import '../../stylesheets/undelete.css'
import { postJSON } from '../client-utils'

export default function (props) {
  const [reason, setReason] = useState('')

  function handleInput (e) {
    setReason(e.target.value)
  }

  function handleClick () {
    postJSON('api/undelete', Object.assign(props.args, { reason }))
    window.location.href = '/Special:Editor'
  }

  return (
    <div className='undelete-box'>
      <div className='bold'>Undelete item</div>
      <div className='undelete--reason-box'>
        <span>Reason:</span>
        <input type='text' value={reason} onChange={handleInput} />
      </div>
      <button className='blue-button' onClick={handleClick}>Undelete</button>
    </div>
  )
}
