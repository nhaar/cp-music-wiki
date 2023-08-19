import React from 'react'
import Main from './components/Main'
import Diff from './components/Diff'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={Diff} args={window.diff} title='Difference between revisions' />)
