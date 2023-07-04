import { postJSON } from './utils.js'

/*******************************************************
* model
*******************************************************/

const urlParams = new URLSearchParams(window.location.search)
const name = urlParams.get('n')

/*******************************************************
* view
*******************************************************/

// get the page info
postJSON('api/get-song', { name })
  .then(response => {
    if (response.status === 200) {
      response.json().then(data => {
        if (data) {
          document.body.innerHTML = data.name
        }
      })
    } else {
      document.body.innerHTML = 'NO SONG FOUND'
    }
  })

/*******************************************************
* controller
*******************************************************/
