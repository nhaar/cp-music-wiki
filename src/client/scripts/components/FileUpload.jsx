import React, { useState } from 'react'

/** Component for the file upload page */
export default function FileUpload () {
  const [file, setFile] = useState('')

  function handleChange (e) {
    setFile(e.target.files[0])
  }

  function handleClick (e) {
    if (window.confirm('Submit?')) {
      const formData = new FormData()
      formData.append('file', file)
      fetch('api/submit-file', {
        method: 'POST',
        body: formData
      }).then(res => {
        if (res.status === 200) window.alert('Done')
        else window.alert('Error')
      })
    }
  }

  const SubmitButton = file
    ? () => (
      <button onClick={handleClick}> SUBMIT </button>
      )
    : () => (
      <div />
      )

  return (
    <div>
      <input type='file' onChange={handleChange} />
      <SubmitButton />
    </div>

  )
}
