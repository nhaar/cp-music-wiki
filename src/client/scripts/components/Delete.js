import React from 'react'
import '../../stylesheets/delete.css'

export default function Delete () {
  return (
    <div>
      <div className='bold'> Warning: The item you are about to delete has a history with n revisions </div>
      <div className='delete--explanation'>
        You are about to delete "ITEM NAME", which will exclude the item from anything inside the wiki. This action can be undone at any time by an admin.
      </div>
      <div className='delete--box'>
        <div className='bold delete--delete'>Delete</div>
        <div className='delete--reason'>
          <span>Reason:</span>
          <select />
        </div>
        <div className='delete--reason'>
          <span>Other/additional reason:</span>
          <input type='text' />
        </div>
        <div className='delete--watch'>
          <input type='checkbox' />
          <span>Watch this page</span>
        </div>
        <button className='red-button delete--button'>
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
