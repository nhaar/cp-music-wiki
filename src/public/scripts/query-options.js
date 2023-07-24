import { createElement, postAndGetJSON } from './utils.js'

/**
 * Object with information about the
 * current use of data for the query
 * @typedef {object} TakenInfo
 *  @property {boolean} hasUntakenId - If there exists any data input that could take data and has not received a valid input
 * @property {string[]} takenIds - The list of all IDs for the current data type that have already being claimed by the user input
 */

/**
 * Create a search query system
 * @param {HTMLInputElement} input - Reference to input the query will be added to
 * @param {string} dataVar - Name of the data variable to store the option ID in the input
 * @param {string} databaseVar - Name of the column in the database corresponding to the ID
 * @param {string} databaseValue - Name of the column in the database corresponding to the displayed value in the query
 * @param {function(string) : import("./editor").Row[]} fetchDataFunction -
 * Function that takes a string to filter search results and
 * gives all the rows that match the result under the database
 * @param {function(HTMLInputElement) : TakenInfo} checkTakenFunction
 * Function that gets taken info relative to the input element(s)
 * @param {import("./submit-block").Blocker} blocker - If the query is associated with a button to block, the blocker object of the button
 */
export function createSearchQuery (input, type) {
  // for when taken function and blockers are useless

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
    queryOptions.addEventListener(event, () => (input.dataset.choosing = listenerRel[event]))
  }

  // function too update options each time
  const updateQuery = () => {
    setPosition()

    postAndGetJSON('api/get-by-name', { type, keyword: input.value}).then(data => {

      queryOptions.innerHTML = ''
      for (const id in data) {
        const optionElement = createElement({ parent: queryOptions, innerHTML: data[id] })
        optionElement.addEventListener('click', () => {
          queryOptions.innerHTML = ''
          input.dataset.id = id
          input.value = data[id]

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
