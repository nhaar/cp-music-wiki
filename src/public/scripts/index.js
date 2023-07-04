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
  fetch('api/create-song', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
})
