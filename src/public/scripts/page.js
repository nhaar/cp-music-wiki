import { getCookies, selectElement, styleElement } from './utils.js'

const cookies = getCookies()

if (cookies.session) {
  const anchor = selectElement('user-link')
  anchor.setAttribute('href', '/')
  anchor.innerHTML = cookies.username
}

const menu = selectElement('menu-img')
const sidebarElement = selectElement('sidebar')

let sidebar = cookies.sidebar !== 'true'
function swapImage () {
  console.log('hey')
  sidebar = !sidebar
  menu.src = sidebar
    ? 'images/double-arrow.png'
    : 'images/menu.png'
  if (sidebar) {
    document.cookie = 'sidebar=true'
    sidebarElement.classList.remove('hidden')
  } else {
    styleElement(sidebarElement, 'hidden')
    document.cookie = 'sidebar=false'
  }
}

swapImage()

menu.addEventListener('click', swapImage)
