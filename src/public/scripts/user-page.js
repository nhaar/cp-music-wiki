import { selectElement, postAndGetJSON } from './utils.js'

const button = selectElement('send')
const name = selectElement('name')
const pass = selectElement('password')

button.addEventListener('click', async () => {
  const user = name.value
  const password = pass.value
  const data = await postAndGetJSON('api/login', { user, password })
  const token = data.token
  if (token) {
    const date = new Date()
    date.setTime(date.getTime() + 24 * 60 * 60 * 1000)
    document.cookie = `session=${token}`
    document.cookie = `username=${user}`
  }
})
