import React from 'react'
import Main from './components/Main'
import Editor from './components/Editor'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={Editor} title='Read' args={{ editorData: window.editorData, row: window.row, editor: false }} />)
