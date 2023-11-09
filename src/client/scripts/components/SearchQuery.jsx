import React, { useEffect, useState } from 'react'

import '../../stylesheets/query.css'

/** Component for a search query */
export default function SearchQuery ({ text: textSetter, readonly, getter, iterateData, passInfo, placeholder }) {
  const [text, setText] = useState(typeof textSetter === 'function' ? null : textSetter)
  const [isHovering, setIsHovering] = useState(false)
  const [options, setOptions] = useState([])

  useEffect(() => {
    (async () => {
      if (text === null) {
        setText(await textSetter())
      }
    })()
  }, [])

  async function updateQuery (e) {
    if (!readonly) {
      const data = await getter(e.target.value)
      const elements = []
      iterateData(data, (name, ...args) => {
        function clickOption () {
          passInfo && passInfo(name, ...args)
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
      <input value={text || ''} onClick={updateQuery} onBlur={blur} onChange={queryType} readOnly={readonly} placeholder={placeholder || ''} />
      <div className='query--options' onMouseOver={mouseOver} onMouseOut={mouseOut}>
        {options}
      </div>
    </div>
  )
}
