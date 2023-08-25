import React from 'react'
import Main from './components/Main.js'
import SongGen from './components/gens/SongGen.js'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={SongGen} title={window.name} args={{ data: window.data, name: window.name }} />)
