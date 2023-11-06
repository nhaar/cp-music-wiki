import React from 'react'
import '../../stylesheets/user-login.css'
import { postAndGetJSON } from '../client-utils.js'

/** Component for the user login page */
export default function UserLogin () {
  const [values, setValues] = React.useState({
    user: '',
    password: ''
  })
  const [remember, setRemember] = React.useState(false)

  async function click () {
    const data = await postAndGetJSON('api/login', values)
    const token = data.token
    if (token) {
      const expires = remember ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT' : ''
      document.cookie = `session=${token}${expires}`
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
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '32px'
      }}
      >
        <input
          type='checkbox' value={remember} onChange={e => setRemember(e.target.checked)} style={{
            height: '100%',
            cursor: 'pointer'
          }}
        />
        <div style={{
          alignItems: 'center',
          display: 'flex',
          height: '100%',
          paddingTop: '4px',
          justifyContent: 'center'
        }}
        >
          Remember me
        </div>
      </div>
    </div>
  )
}
