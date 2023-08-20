import React from 'react'
import Main from './components/Main.js'
import FileUpload from './components/FileUpload.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={FileUpload} title='Upload a file' />)
