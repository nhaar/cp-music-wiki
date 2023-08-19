import React from 'react'
import '../../stylesheets/pre-editor.css'
import QueryInput from './QueryInput'
import { findIndexInObject, postAndGetJSON } from '../utils'

function EditButton (props) {
  function handleClick () {
    if (isNaN(props.info.id)) {
      window.alert('No item selected!')
    } else {
      const id = props.info.isStatic ? 0 : props.info.id
      window.location.href = `/Special:Editor?t=${props.info.t}&id=${id}`
    }
  }
  return <button className='blue-button' onClick={handleClick}> EDIT </button>
}

function DeleteButton (props) {
  async function handleClick () {
    if (isNaN(props.info.id)) {
      window.alert('No item selected!')
    } else {
      const confirm = window.confirm(`Are you sure you want to delete "${props.info.name} - ${props.info.item}"`)
      if (confirm) {
        const doubleCheck = window.confirm('REALLY ERASE?')
        if (doubleCheck) {
          const response = await postAndGetJSON('api/delete', { cls: props.info.cls, id: Number(props.info.id) })
          if (response.length === 0) {
            alert('Deleted')
          } else {
            alert(`Erros ${JSON.stringify(response)}`)
          }
        }
      }
    }
  }
  return <button className='red-button' onClick={handleClick}> DELETE </button>
}

function CreateButton (props) {
  function handleClick () {
    window.location.href = `/Special:Editor&t=${props.info.t}`
  }
  return <button className='green-button' onClick={handleClick}> CREATE NEW </button>
}

export default function PreEditor (props) {
  const [buttonInfo, setButtonInfo] = React.useState({})
  const [clsInfo, setClsInfo] = React.useState({})
  const options = []
  props.args.forEach((info, i) => {
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
    const info = props.args[e.target.value]
    const index = findIndexInObject(props.args, 'cls', info.cls)
    const newInfo = { t: index, ...info }
    if (info.isStatic) {
      newInfo.id = 0
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
        <QueryInput key={0} cls={clsInfo.cls} passInfo={passInfo} />,
        <EditButton key={1} info={buttonInfo} />,
        <CreateButton key={2} info={clsInfo} />,
        <DeleteButton key={3} info={buttonInfo} />
      ]
    }
  }

  return (
    <div className='pre-editor--container'>
      <select defaultValue={-1} onChange={updateChildren}>
        <option value={-1} disabled> [CHOSE WHAT TO EDIT] </option>
        {options}
      </select>
      {children}
    </div>
  )
}
