import React from 'react'
import Main from './components/Main.js'
import Editor from './components/Editor.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={Editor} title='Editor' args={{ editorData: window.editorData, row: window.row, editor: true }} />)
