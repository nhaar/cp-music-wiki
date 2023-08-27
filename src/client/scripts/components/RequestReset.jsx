import React, { useState } from 'react'
import { postJSON } from '../client-utils'

export default function RequestReset () {
  const [name, setName] = useState('')

  function handleClick () {
    postJSON('api/send-reset-req', { name })
    window.alert('Password reset request sent')
    window.location.href = '/'
  }

  return (
    <div
      className='flex-column' style={{
        width: '500px',
        rowGap: '20px'
      }}
    >
      <div> We will send an email with the instructions to reset your password </div>
      <div className='flex-column'>
        <span>Account name</span>
        <input value={name} onChange={e => setName(e.target.value)} type='text' placeholder='Write the name of the account' />
      </div>
      <button className='blue-button' onClick={handleClick}>Submit</button>
    </div>
  )
}
