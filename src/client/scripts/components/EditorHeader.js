import React, { cloneElement, useState } from 'react'
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

  function redirect (page) {
    return () => {
      window.location.href = page
    }
  }

  const paramsSuffix = `?t=${props.t}&id=${props.id}`
  const specialUrl = word => `/Special:${word}${paramsSuffix}`
  const specialRedirect = word => redirect(specialUrl(word))

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
    <div key={2} onClick={redirect(`/Special:Delete?t=${props.t}&id=${props.id}`)}>Delete</div>
  ].map((component, i) => {
    const className = component.type === 'img'
      ? 'star-img'
      : i === props.cur ? 'header-setting-cur' : 'header-setting-link'

    return cloneElement(component, {
      className
    })
  })

  if (props.isStatic) {
    // if static
    components.splice(3, 2)
  } else if (!props.id) {
    // creating page
    components.splice(1, 5)
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
