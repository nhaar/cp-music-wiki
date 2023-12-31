import React, { useState } from 'react'
import '../../stylesheets/delete.css'
import { getCheckedChangeHandler, getCookies, postJSON } from '../client-utils'
import { getName } from '../../../server/misc/common-utils'
import EditorHeader from './EditorHeader'

/** Component for the warning for item references */
function ReferenceWarning ({ refs }) {
  const components = refs.map((ref, i) => {
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

/** Component for the delete page */
export default function Delete ({ deleteData, row }) {
  const [reason, setReason] = useState(0)
  const [other, setOther] = useState('')
  const [watch, setWatch] = useState(true)

  function handleSelect (e) {
    setReason(e.target.value)
  }

  function handleInput (e) {
    setOther(e.target.value)
  }

  async function clickDelete () {
    const token = getCookies().session
    await postJSON('api/delete', {
      cls: deleteData.cls,
      id: Number(row.id),
      token,
      reason: Number(reason) === 0 ? other : reason,
      watchDays: watch ? 0 : undefined
    })
    window.alert('Item deleted')
    window.location.href = '/Special:Items'
  }

  const header = (
    <EditorHeader cur={4} isStatic={false} id={row.id} name={getName(row.querywords)} cls={deleteData.cls} />
  )

  if (deleteData.refs.length !== 0) {
    return (
      <div>
        {header}
        <ReferenceWarning refs={deleteData.refs} />
      </div>
    )
  } else {
    return (
      <div>
        {header}
        <div className='bold'> Warning: The item you are about to delete has a history with n revisions </div>
        <div className='delete--explanation'>
          You are about to delete "{getName(row.querywords)}", which will exclude the item from anything inside the wiki. This action can be undone at any time by an admin.
        </div>
        <div className='delete--box'>
          <div className='bold delete--delete'>Delete</div>
          <div className='delete--reason'>
            <span>Reason:</span>
            <select value={reason} onChange={handleSelect}>
              <option value={0}>Other reason</option>
              <option>Spam</option>
              <option>Vandalism</option>
            </select>
          </div>
          {Number(reason) === 0
            ? (
              <div className='delete--reason'>
                <span>Other/additional reason:</span>
                <input type='text' value={other} onChange={handleInput} />
              </div>
              )
            : undefined}

          <div className='delete--watch'>
            <input type='checkbox' checked={watch} onChange={getCheckedChangeHandler(setWatch)} />
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
