import React, { cloneElement, useState } from 'react'
import '../../stylesheets/editor-header.css'
import StarEmpty from '../../images/star-empty.png'
import StarFull from '../../images/star-full.png'

export default function EditorHeader ({ cur, isStatic, id, deleted, predefined, n }) {
  const [isEmpty, setIsEmpty] = useState(true)

  function fillStar () {
    setIsEmpty(false)
  }
  function emptyStar () {
    setIsEmpty(true)
  }

  function redirect (page) {
    return () => {
      window.location.href = page
    }
  }

  const paramsSuffix = `?id=${id}`
  const specialUrl = word => `/Special:${word}${paramsSuffix}`
  const specialRedirect = word => redirect(specialUrl(word))
  const deleteText = deleted ? 'Undelete' : 'Delete'

  const components = [
    <div key={-2} onClick={specialRedirect('Read')}>Read</div>,
    <div key={0} onClick={specialRedirect('Editor')}>Edit</div>,
    <div key={1}>View history</div>,
    <img
      key={-1}
      onMouseOver={fillStar}
      onMouseLeave={emptyStar}
      src={isEmpty ? StarEmpty : StarFull}
    />,
    (
      <div key={2} onClick={redirect(`/Special:${deleteText}?id=${id}`)}>
        {deleteText}
      </div>
    )

  ].map((component, i) => {
    const className = component.type === 'img'
      ? 'star-img'
      : i === cur ? 'header-setting-cur' : 'header-setting-link'

    return cloneElement(component, {
      className
    })
  })

  if (isStatic || predefined) {
    // if undeletable
    components.splice(3, 2)
    if (isStatic) {
      // if static
      components.splice(0, 0, (
        <div key={-10} className='static-text' title="This item class is unique and you can't add or delete items">(static)</div>
      ))
    }
  } else if (!id) {
    // creating page
    components.splice(0, components.length)
    components[0] = [
      (
        <div
          key={0} onClick={() => { window.location.href = `/Special:Editor?n=${n}` }}
          className='header-setting-cur'
        >
          Create
        </div>
      )
    ]
  } else if (deleted) {
    components.splice(1, 1)
  }

  return (
    <div className='editor--header-container'>
      <div className='editor--header-options'>
        {components}
      </div>
      <div className='header-line' />
    </div>
  )
}
