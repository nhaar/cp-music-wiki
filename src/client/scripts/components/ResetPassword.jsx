import React, { useState } from 'react'
import { postJSON, setNthValue } from '../client-utils'
import { MIN_PASSWORD_LENGTH } from '../../../server/misc/common-utils'
import { createWarning } from '../react-utils'

export default function ({ token }) {
  const [values, setValues] = useState(['', ''])

  function handleChange (i) {
    return e => {
      setNthValue(i, e.target.value, setValues)
    }
  }

  function handleClick () {
    postJSON('api/reset-password', { token, password: values[0] })
    window.alert('Password changed')
    window.location.href = '/'
  }

  const doesMatch = values[0] === values[1]
  const goodLength = values[0].length >= MIN_PASSWORD_LENGTH

  return (
    <div
      className='flex-column'
      style={{
        width: '500px',
        rowGap: '20px'
      }}
    >
      {[
        ['Password', 'Write your new password'],
        ['Confirm password', 'Confirm your new password']
      ].map((element, i) => {
        const [span, placeholder] = element
        return (
          <div key={i} className='flex-column'>
            <span>{span}</span>
            <input
              key={i}
              type='password'
              value={values[i]}
              onChange={handleChange(i)}
              placeholder={placeholder}
            />
          </div>
        )
      })}
      {doesMatch && goodLength
        ? (
          <button className='blue-button' onClick={handleClick}>
            Reset password
          </button>
          )
        : (
          <div className='flex-column'>
            {[
              [doesMatch, 'Password must match'],
              [goodLength, 'Password must be at least 8 characters long']
            ].map((element, i) => {
              const [isValid, text] = element
              return createWarning(isValid, text, i)
            })}
          </div>
          )}
    </div>
  )
}
