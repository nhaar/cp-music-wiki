import React, { useState } from 'react'
import '../../stylesheets/editor-header.css'
import StarEmpty from '../../images/star-empty.png'
import StarFull from '../../images/star-full.png'

export default function EditorHeader (props) {
  const [isEmpty, setIsEmpty] = useState(true)

  function fillStar () {
    setIsEmpty(false)
  }
  function emptyStar () {
    setIsEmpty(true)
  }

  const components = [
    'Edit',
    'View history',
    'Delete',
    'Move',
    'Purge'
  ].map((text, i) => <div key={i} className={i === props.cur ? 'header-setting-cur' : 'header-setting-link'}>{text}</div>)

  components.splice(2, 0, (
    <img
      key={-1}
      onMouseOver={fillStar}
      onMouseLeave={emptyStar}
      className='star-img' src={isEmpty ? StarEmpty : StarFull}
    />
  ))

  return (
    <div className='editor--header-container'>
      <div className='editor--header-options'>
        {components}
      </div>
      <div className='header-line' />
    </div>
  )
}
