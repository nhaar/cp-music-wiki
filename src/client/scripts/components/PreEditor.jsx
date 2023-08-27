import React from 'react'
import '../../stylesheets/pre-editor.css'
import QueryInput from './QueryInput'

function EditButton (props) {
  function handleClick () {
    if (isNaN(props.info.id)) {
      window.alert('No item selected!')
    } else {
      window.location.href = `/Special:Read?id=${props.info.id}`
    }
  }
  return <button className='blue-button' onClick={handleClick}> View </button>
}

function CreateButton (props) {
  function handleClick () {
    window.location.href = `/Special:Editor?n=${props.info.n}`
  }
  return <button className='blue-button' onClick={handleClick}> CREATE NEW </button>
}

export default function PreEditor (props) {
  const [buttonInfo, setButtonInfo] = React.useState({})
  const [clsInfo, setClsInfo] = React.useState({})
  const options = []
  props.arg.forEach((info, i) => {
    options.push(
      <option key={i} value={i}>{info.name}</option>
    )
  })

  function passInfo (id, item) {
    const newInfo = {
      item,
      id,
      ...clsInfo
    }
    setButtonInfo(newInfo)
  }

  function updateChildren (e) {
    const index = Number(e.target.value)
    const info = props.arg[index]
    const newInfo = { n: index, ...info }
    if (newInfo.id !== undefined) {
      newInfo.isStatic = true
      setButtonInfo(newInfo)
    }

    setClsInfo(newInfo)
  }

  let children
  if (clsInfo.cls) {
    if (clsInfo.isStatic) {
      children = [
        <EditButton key={0} info={buttonInfo} />
      ]
    } else {
      children = [
        <QueryInput key={0} cls={clsInfo.cls} passInfo={passInfo} withDeleted />,
        <EditButton key={1} info={buttonInfo} />,
        <CreateButton key={2} info={clsInfo} />
      ]
    }
  }

  return (
    <div className='pre-editor--container'>
      <select defaultValue={-1} onChange={updateChildren}>
        <option value={-1} disabled> [CHOSE WHAT TO VIEW] </option>
        {options}
      </select>
      {children}
    </div>
  )
}
