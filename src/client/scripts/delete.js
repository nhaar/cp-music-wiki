import React from 'react'
import Main from './components/Main.js'
import Delete from './components/Delete.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={Delete} title='Delete item' args={{ editorData: window.deleteData, row: window.row }} />)
