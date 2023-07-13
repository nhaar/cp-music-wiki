import { createElement } from "./utils.js"

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
export function createSearchQuery (input, dataVar, databaseVar, databaseValue, fetchDataFunction, checkTakenFunction, blocker) {
  // element to have the available options
  const queryOptions = createElement({ parent: input.parentElement, className: 'query-options' })

  queryOptions.style.top = input.offsetHeight + input.offsetTop + 'px'
  queryOptions.style.width = input.offsetWidth + 'px'
  queryOptions.style.left = input.offsetLeft + 'px'

  // flag for hovering options or not
  const listenerRel = { mouseover: '1', mouseout: '' }
  for (const event in listenerRel) {
    queryOptions.addEventListener(event, () => (input.dataset.choosing = listenerRel[event]))
  }

  // function too update options each time
  const updateQuery = () => {
    fetchDataFunction(input.value).then(data => {
      // fetching all taken data
      const { hasUntakenId, takenIds } = checkTakenFunction(input)
      if (blocker) {
        if (hasUntakenId) blocker.block(dataVar)
      }

      queryOptions.innerHTML = ''
      data.forEach(option => {
        // filtering taken options
        if (!takenIds.includes(option[databaseVar] + '')) {
          const optionElement = createElement({ parent: queryOptions, innerHTML: option[databaseValue ]})
          optionElement.addEventListener('click', () => {
            queryOptions.innerHTML = ''
            input.dataset[dataVar] = option[databaseVar]
            input.value = option[databaseValue]
            input.classList.remove(blocker.blockedClass)
  
            if (blocker) {
              const { hasUntakenId } = checkTakenFunction(input)
              if (!hasUntakenId) blocker.unblock(dataVar)
            }
          })  
        }
      })
    })
  }

  input.addEventListener('input', () => {
    updateQuery()
    // reset ID if altered anything
    input.dataset[dataVar] = ''
    if (blocker) input.classList.add(blocker.blockedClass)
  })
  input.addEventListener('focus', () => updateQuery())
  input.addEventListener('blur', () => {
    // track if the user is focusing out by picking an option
    if (!input.dataset.choosing) {
      queryOptions.innerHTML = ''
    }
  })
}
