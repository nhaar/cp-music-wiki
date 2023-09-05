import React from 'react'
import '../../stylesheets/user-login.css'
import { postAndGetJSON } from '../client-utils.js'

/** Component for the user login page */
export default function UserLogin () {
  const [values, setValues] = React.useState({
    user: '',
    password: ''
  })

  async function click () {
    const data = await postAndGetJSON('api/login', values)
    const token = data.token
    if (token) {
      document.cookie = `session=${token}`
      document.cookie = `username=${values.user}`
      window.alert('Login successful')
      window.location.href = '/'
    } else {
      window.alert('Invalid username or password')
    }
  }

  function change (key) {
    return e => {
      setValues(prev => {
        return {
          ...prev,
          [key]: e.target.value
        }
      })
    }
  }

  return (
    <div className='login'>
      <div className='info-input'>
        <span>Username</span>
        <input type='text' placeholder='Enter your username' onChange={change('user')} />
      </div>
      <div className='info-input'>
        <span>Password</span>
        <input type='password' placeholder='Enter your password' onChange={change('password')} />
      </div>
      <a href='/Special:ResetPassword'>Reset password</a>
      <button className='blue-button' onClick={click}>
        Log in
      </button>
    </div>
  )
}
