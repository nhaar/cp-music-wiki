import React from 'react'
import Main from './components/Main.js'
import MainPage from './components/MainPage.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={MainPage} title='Main Page' />)
