import React from 'react'
import Main from './components/Main.js'
import OstGen from './components/gens/OstGen.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={OstGen} title={window.name} args={{ data: window.data, name: window.name }} />)
