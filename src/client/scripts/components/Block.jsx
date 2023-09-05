import React, { useState } from 'react'
import { postJSON } from '../client-utils'

/** Component for the (un)block page */
export default function Block ({ user, blocked }) {
  const [reason, setReason] = useState('')

  async function handleClick () {
    await postJSON('api/block', { user, reason })
    window.alert(`User ${blocked ? 'unblocked' : 'blocked'} successfully`)
    window.location.href = '/'
  }

  return (
    <div
      className='flex-column' style={{
        rowGap: '20px'
      }}
    >
      <div>{blocked ? 'Unblock' : 'Block'} user "{user}" and all of their IP addresses?</div>
      <div
        className='flex-column' style={{
          rowGap: '2px'
        }}
      >
        <div>Reason</div>
        <input
          placeholder={`Write the reason for ${blocked ? 'unblocking' : 'blocking'}`}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </div>

      <button
        className={blocked ? 'blue-button' : 'red-button'}
        onClick={handleClick}
      >
        {blocked ? 'UNBLOCK' : 'BLOCK'}
      </button>

    </div>
  )
}
