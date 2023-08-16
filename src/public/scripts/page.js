import { getCookies, selectElement } from './utils.js'

const cookies = getCookies()

if (cookies.session) {
  const anchor = selectElement('user-link')
  anchor.setAttribute('href', '/')
  anchor.innerHTML = cookies.username
}
