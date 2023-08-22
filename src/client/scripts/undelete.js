import React from 'react'
import Main from './components/Main.js'
import Undelete from './components/Undelete.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={Undelete} title='Undelete item' args={{ cls: window.cls, id: window.id }} />)
