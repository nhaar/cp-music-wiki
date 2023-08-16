import { createElement, paramsToObject, postAndGetJSON, selectElement } from './utils.js'

const params = paramsToObject()

postAndGetJSON('api/get-revisions', params).then(data => {
  const { diff } = data
  const diffDiv = selectElement('diff-viewer')

  const formatValue = str => {
    let result
    result = str.replace(/\n/g, '<br>')
    result = result.replace(/(?<=(<br>(&#160|\s)*))\s/g, '&#160')

    return result
  }

  const createNewDiff = (value, type) => {
    let sign
    let className
    if (type === 'add') {
      sign = '+'
      className = 'add-diff'
    } else if (type === 'remove') {
      sign = '-'
      className = 'remove-diff'
    }
    const diffContainer = createElement({ parent: diffDiv, className: 'diff-container' })
    createElement({ parent: diffContainer, innerHTML: sign, className: 'sign' })
    createElement({ parent: diffContainer, innerHTML: formatValue(value), className })
  }

  diff.forEach(group => {
    const type = group[0]
    if (type === 'remove' || type === 'add') {
      createElement({ parent: diffDiv })
      createNewDiff((group[1].value), type)
    } else if (type === 'removeadd' || type === 'addremove') {
      const types = type.match(/(remove|add)/g)
      for (let i = 0; i < 2; i++) {
        const value = createHTML(group[3], i)
        createNewDiff(value, types[i])
      }
    }
  })
})

function createHTML (diff, isAdd) {
  let str = ''
  const className = isAdd ? 'add-span' : 'remove-span'
  diff.forEach(change => {
    if ((change.added && !isAdd) || (change.removed && isAdd)) {
      str += `<span class="${className}">${change.value}</span>`
    } else if (!change.added && !change.removed) {
      str += change.value
    }
  })

  return str
}
