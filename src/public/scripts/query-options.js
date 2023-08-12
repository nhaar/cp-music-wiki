import { createElement, postAndGetJSON } from './utils.js'

/**
 *
 * @param {*} input
 * @param {*} cls
 */
export async function createSearchQuery (input, cls) {
  // for when taken function and blockers are useless

  const { id } = input.dataset
  if (id) {
    const name = await postAndGetJSON('api/get-name', { cls, id: Number(id) })
    input.value = name.name
  }

  // element to have the available options
  const queryOptions = createElement({ parent: input.parentElement, className: 'query-options' })

  const setPosition = () => {
    queryOptions.style.top = input.offsetHeight + input.offsetTop + 'px'
    queryOptions.style.width = input.offsetWidth + 'px'
    queryOptions.style.left = input.offsetLeft + 'px'
  }

  // flag for hovering options or not
  const listenerRel = { mouseover: '1', mouseout: '' }
  for (const event in listenerRel) {
    queryOptions.addEventListener(event, () => { input.dataset.choosing = listenerRel[event] })
  }

  // function too update options each time
  const updateQuery = () => {
    setPosition()

    postAndGetJSON('api/get-by-name', { cls, keyword: input.value }).then(data => {
      queryOptions.innerHTML = ''
      for (const id in data) {
        const optionElement = createElement({ parent: queryOptions, innerHTML: data[id] })
        optionElement.addEventListener('click', () => {
          queryOptions.innerHTML = ''
          input.dataset.id = id
          input.value = data[id]
          input.dataset.choosing = ''
        })
      }
    })
  }

  input.addEventListener('input', () => {
    updateQuery()
    // reset ID if altered anything
    input.dataset.id = ''
  })
  input.addEventListener('focus', () => updateQuery())
  input.addEventListener('blur', () => {
    // track if the user is focusing out by picking an option
    if (!input.dataset.choosing) {
      queryOptions.innerHTML = ''
    }
  })
}
