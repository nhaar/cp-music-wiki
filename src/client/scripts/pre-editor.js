import React from 'react'
import Main from './components/Main'
import PreEditor from './components/PreEditor'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={PreEditor} title='Editor selector' args={window.data} />)
