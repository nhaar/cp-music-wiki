import React from 'react'

import { postAndGetJSON, selectElements } from '../utils'
import '../../stylesheets/query.css'

export default function QueryInput (props) {
  const [id, setId] = React.useState('')
  const [text, setText] = React.useState('')
  const [isHovering, setIsHovering] = React.useState(false)
  const [options, setOptions] = React.useState([])

  React.useEffect(() => {
    (async () => {
      if (props.id) {
        const name = await postAndGetJSON('api/get-name', { cls: props.cls, id: Number(props.id) })
        setText(name)
      }
    })()
  })

  async function updateQuery (e) {
    const data = await postAndGetJSON('api/get-by-name', { cls: props.cls, keyword: e.target.value })
    const elements = []
    for (const id in data) {
      const name = data[id]
      function clickOption () {
        setId(id)
        setOptions([])
        setIsHovering(false)
        setText(name)
      }
      elements.push(
        <div key={name} onClick={clickOption}>
          {name}
        </div>
      )
    }
    setOptions(elements)
  }

  function mouseOver () {
    setIsHovering(true)
  }

  function mouseOut () {
    setIsHovering(false)
  }

  function blur () {
    if (!isHovering) {
      setOptions([])
    }
  }

  function queryType (e) {
    updateQuery(e)
    setText(e.target.value)
    setId('')
  }

  return (
    <div className='query--parent'>
      <input value={text} onClick={updateQuery} onBlur={blur} onChange={queryType} />
      <div className='query--options' onMouseOver={mouseOver} onMouseOut={mouseOut}>
        {options}
      </div>
    </div>
  )
}
