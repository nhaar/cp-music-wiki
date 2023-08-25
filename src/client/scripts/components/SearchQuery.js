import React, { useEffect, useState } from 'react'

import '../../stylesheets/query.css'

export default function SearchQuery (props) {
  const [text, setText] = useState(typeof props.text === 'function' ? null : props.text)
  const [isHovering, setIsHovering] = useState(false)
  const [options, setOptions] = useState([])

  useEffect(() => {
    (async () => {
      if (text === null) {
        setText(await props.text())
      }
    })()
  })

  async function updateQuery (e) {
    if (!props.readonly) {
      const data = await props.getter(e.target.value)
      const elements = []
      props.iterateData(data, (name, ...args) => {
        function clickOption () {
          props.passInfo && props.passInfo(name, ...args)
          setOptions([])
          setIsHovering(false)
          setText(name)
        }
        elements.push(
          <div key={name} onClick={clickOption}>
            {name}
          </div>
        )
      })
      setOptions(elements)
    }
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
  }

  return (
    <div className='query--parent'>
      <input value={text || ''} onClick={updateQuery} onBlur={blur} onChange={queryType} readOnly={props.readonly} placeholder={props.placeholder || ''} />
      <div className='query--options' onMouseOver={mouseOver} onMouseOut={mouseOut}>
        {options}
      </div>
    </div>
  )
}
