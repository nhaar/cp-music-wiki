import React from 'react'
import Main from './components/Main'
import UserLogin from './components/UserLogin'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={UserLogin} title='Log In' />)
