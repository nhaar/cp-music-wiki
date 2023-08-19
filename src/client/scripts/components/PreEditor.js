import React from 'react'
import '../../stylesheets/pre-editor.css'
import QueryInput from './QueryInput'

function EditButton () {
  return <button className='blue-button'> EDIT </button>
}

function DeleteButton () {
  return <button className='red-button'> DELETE </button>
}

function CreateButton () {
  return <button className='green-button'> CREATE NEW </button>
}

export default function PreEditor (props) {
  const [children, setChildren] = React.useState([])
  const options = []
  props.args.forEach((info, i) => {
    options.push(
      <option key={i} value={i}>{info.name}</option>
    )
  })

  function updateChildren (e) {
    const info = props.args[e.target.value]
    if (info.isStatic) {
      setChildren([
        <EditButton key={0} />
      ])
    } else {
      setChildren([
        <QueryInput key={0} cls={info.cls} />,
        <EditButton key={1} />,
        <CreateButton key={2} />,
        <DeleteButton key={3} />
      ])
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
