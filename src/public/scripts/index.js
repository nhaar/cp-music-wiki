import { postJSON } from './utils.js'

/*******************************************************
* model
*******************************************************/

const songName = document.querySelector('.js-song-name')
const createButton = document.querySelector('.js-create-button')

/*******************************************************
* controller
*******************************************************/

// add song to database
createButton.addEventListener('click', () => {
  const name = songName.value
  postJSON('api/create-song', { name })
})
