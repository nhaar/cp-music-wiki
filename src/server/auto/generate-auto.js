const fs = require('fs')
const path = require('path')
const list = require('./auto-list')
const hashed = require('./hashed-list')

list.forEach((component, i) => {
  fs.writeFileSync(path.join(__dirname, `../../client/scripts/auto/${hashed[i]}.js`), `
    import React from 'react'
    import Main from '../components/Main.jsx'
    import Content from '../components/${component}.jsx'

    import { createRoot } from 'react-dom/client'

    createRoot(document.getElementById('root')).render(<Main content={Content} title={window.title} arg={window.arg} user={window.user} />)
  `)
})
