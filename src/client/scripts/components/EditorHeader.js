import React, { cloneElement, useState } from 'react'
import '../../stylesheets/editor-header.css'
import StarEmpty from '../../images/star-empty.png'
import StarFull from '../../images/star-full.png'
import { postAndGetJSON } from '../utils'

export default function EditorHeader (props) {
  const [isEmpty, setIsEmpty] = useState(true)

  function fillStar () {
    setIsEmpty(false)
  }
  function emptyStar () {
    setIsEmpty(true)
  }

  async function deleteItem () {
    const confirm = window.confirm(`Are you sure you want to delete "${props.name}"`)
    if (confirm) {
      const doubleCheck = window.confirm('REALLY ERASE?')
      if (doubleCheck) {
        const response = await postAndGetJSON('api/delete', { cls: props.cls, id: Number(props.id) })
        if (response.length === 0) {
          window.alert('Deleted')
        } else {
          window.alert(`Erros ${JSON.stringify(response)}`)
        }
      }
    }
  }

  const components = [
    <div key={0}>Edit</div>,
    <div key={1}>View history</div>,
    <img
      key={-1}
      onMouseOver={fillStar}
      onMouseLeave={emptyStar}
      src={isEmpty ? StarEmpty : StarFull}
    />,
    <div key={2} onClick={deleteItem}>Delete</div>,
    <div key={3}>Move</div>,
    <div key={4}>Purge</div>
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
