import React, { useEffect, useState } from 'react'
import '../../stylesheets/create-acc.css'
import { postAndGetJSON, postJSON, setNthValue } from '../client-utils'
import { createWarning } from '../react-utils'
const validator = require('validator')
const { MIN_PASSWORD_LENGTH } = require('../../../server/misc/common-utils')

/** Component for the create account page */
export default function CreateAccount () {
  const inputs = [
    ['Username', 'Write your username', 'text'],
    ['Password', 'Write your password', 'password'],
    ['Confirm password', 'Confirm your password', 'password'],
    ['Email', 'Write your email', 'text'],
    ['Confirm email', 'Confirm your email', 'text']
  ]

  const [values, setValues] = useState(inputs.map(() => ''))
  const [takenName, setTakenName] = useState(false)

  function handleChange (i) {
    return e => {
      setNthValue(i, e.target.value, setValues)
    }
  }

  useEffect(() => {
    (async () => {
      setTakenName(
        (await postAndGetJSON('api/check-username', { name: values[0] })).taken
      )
    })()
  }, [values[0]])

  const emptyName = values[0] === ''
  const smallPassword = values[1].length < MIN_PASSWORD_LENGTH
  const passwordMatches = values[1] === values[2]
  const emailMatches = values[3] === values[4]
  const validEmail = validator.isEmail(values[3])
  const valid = passwordMatches && emailMatches && !smallPassword && validEmail && !emptyName && !takenName

  async function handleClick () {
    await postJSON('api/create-account', {
      name: values[0],
      password: values[1],
      email: values[3]
    })
    window.alert('Account created successfully')
    window.location.href = '/'
  }

  return (
    <div className='create--container'>
      <div>Fill in the details to create an account</div>
      {inputs.map((element, i) => {
        const [span, placeholder, type] = element
        return (
          <div key={i} className='create--input-container'>
            <span>{span}</span>
            <input value={values[i]} onChange={handleChange(i)} placeholder={placeholder} type={type} />
          </div>
        )
      })}
      {valid
        ? (
          <button onClick={handleClick} className='blue-button'>Create account</button>
          )
        : (
          <div className='create--warnings'>
            {[
              [!emptyName, 'You must enter a name'],
              [!takenName, 'Name is taken'],
              [!smallPassword, `Your password must be at least ${MIN_PASSWORD_LENGTH} characters long`],
              [passwordMatches, 'Paswords do not match'],
              [validEmail, 'Write a valid email adress'],
              [emailMatches, 'Emails do not match']
            ].map((element, i) => {
              const [doesMatch, text] = element
              return createWarning(doesMatch, text, i)
            })}
          </div>
          )}
    </div>
  )
}
