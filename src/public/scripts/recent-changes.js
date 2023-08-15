import { selectElement, createElement } from './utils.js'

fetch('api/recent-changes').then(response => response.json()).then(data => {
  const div = selectElement('changes')
  data.forEach(change => {
    createElement({ parent: div, innerHTML: change, tag: 'li' })
  })
})
