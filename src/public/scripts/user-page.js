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
    document.cookie = `session=${token}`
  }

})
