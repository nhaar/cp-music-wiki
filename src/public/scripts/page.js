import React from 'react'
import Main from './components/Main.js'

import { createRoot } from 'react-dom/client'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<Main tab='home' />)
