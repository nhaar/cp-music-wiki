import React from 'react'
import Main from './components/Main'
import RecentChanges from './components/RecentChanges'

import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<Main content={RecentChanges} title='Recent Changes' />)
