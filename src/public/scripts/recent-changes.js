import { selectElement } from './utils.js'

fetch('api/recent-changes').then(response => response.text()).then(data => {
  const div = selectElement('changes')
  div.innerHTML = data
})
