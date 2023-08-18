import { selectElement } from './utils.js'

let change = 1
const group = false
let recent = 1

fetch('api/recent-changes').then(response => response.text()).then(data => {
  const div = selectElement('changes')
  div.innerHTML = data
})

const settings = selectElement('settings-menu')
selectElement('change-options').addEventListener('click', () => {
  if (document.querySelector('.settings-menu.hidden')) {
    settings.classList.remove('hidden')
  } else {
    settings.classList.add('hidden')
  }
})

function selectOption (isTop, number, unit) {
  const className = 'selected-option'
  const divClass = `${isTop ? 'top' : 'bottom'}-settings`
  const previous = document.querySelector(`.${divClass} .${className}`)
  if (previous) previous.classList.remove(className)
  const button = settings.querySelectorAll(`.${divClass} button`)[number]
  button.classList.add(className)

  const topButton = settings.querySelectorAll('.top-settings button')[change]
  const bottomButton = settings.querySelectorAll('.bottom-settings button')[recent]
  document.querySelector('.button-options-text').innerHTML = `${topButton.innerHTML} change${change === 0 ? '' : 's'}, ${bottomButton.innerHTML} ${recent > 3 ? 'day' : 'hour'}${recent !== 0 && recent !== 4 ? 's' : ''}`
}

function updateTop () {
  selectOption(true, change)
}

function updateBottom () {
  selectOption(false, recent)
}
settings.querySelector('input').checked = group

updateTop()
updateBottom();

[
  ['top', (i, value) => {
    change = i
    updateTop(value)
  }
  ],
  [
    'bottom', (i, value) => {
      recent = i
      updateBottom(value)
    }
  ]
].forEach(element => {
  Array.from(settings.querySelectorAll(`.${element[0]}-settings button`)).forEach((button, i) => {
    button.addEventListener('click', () => { element[1](i, button.innerHTML) })
  })
})
