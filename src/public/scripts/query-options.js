/**
 * Object with information about the
 * current use of data for the query
 * @typedef {object} TakenInfo
 *  @property {boolean} hasUntakenId - If there exists any data input that could take data and has not received a valid input
 * @property {string[]} takenIds - The list of all IDs for the current data type that have already being claimed by the user input
 */

/**
 * Variables needed to setup the query search
 * @typedef {object} QueryConfig * 
 * @property {string} dataVar - Name of the data variable that has the id of the query
 * @property {string} databaseVar - Name of the id variable as is stored in the database (column name)
 * @property {string} databaseValue - Name of the input's value (eg name) table name in the database
 * @property {function(string) : import("./editor").Row[]} fetchDataFunction
 * Function that takes a string to filter search results and
 * all the rows that match the result under the database
 * @property {function(HTMLInputElement) : TakenInfo} checkTakenFunction
 * Function that gets taken info relative the the input element(s)
 */

/**
 * Variables needed to setup the query-blocking upload integration
 * @typedef {object} BlockConfig
 * @property {string} blockVar - Name of the variable that will get saved in the block button for this query
 * @property {function(variable) : void} blockFunction 
 * Function that blocks the button for a given data variable
 * @property {function(variable) : void} unblockFunction
 * Function that unblocks the button for a given data variable
 * @property {string} blockedClass - Name of the CSS class that changes the color of the button that will get blocked
 */

/**
 * Create a search query for an input
 * @param {HTMLDivElement} div - Container for the input
 * @param {string} inputClass - Class for the input that will have the query
 * @param {QueryConfig} queryConfig
 * @param {BlockConfig} blockConfig 
 */
export function createQuery (div, inputClass, queryConfig, blockConfig) {
  const { dataVar } = queryConfig
  let blockedClass
  if (blockConfig) ({ blockedClass } = blockConfig)
  const input = div.querySelector('.' + inputClass)

  // element to have the available options
  const queryOptions = document.createElement('div')
  queryOptions.className = 'query-options'

  queryOptions.style.top = input.offsetHeight + input.offsetTop + 'px'
  queryOptions.style.width = input.offsetWidth + 'px'
  queryOptions.style.left = input.offsetLeft + 'px'

  div.appendChild(queryOptions)


  // flag for hovering options or not
  const listenerRel = { mouseover: '1', mouseout: '' }
  for (const event in listenerRel) {
    queryOptions.addEventListener(event, () => (input.dataset.choosing = listenerRel[event]))
  }

  const updateQuery = () => updateQueryOptions(input, queryOptions, queryConfig, blockConfig)

  input.addEventListener('input', () => {
    updateQuery()
    // reset ID if altered anything
    input.dataset[dataVar] = ''
    if (blockConfig) input.classList.add(blockedClass)
  })
  input.addEventListener('focus', updateQuery)
  input.addEventListener('blur', () => {
    // track if the user is focusing out by picking an option
    if (!input.dataset.choosing) {
      queryOptions.innerHTML = ''
    }
  })
}

/**
 * Update the search query options for an input
 * @param {HTMLInputElement} input - Reference to input
 * @param {HTMLDivElement} queryOptions - Element that will hold the options
 * @param {QueryConfig} queryConfig
 * @param {BlockConfig} blockConfig 
 */
function updateQueryOptions (input, queryOptions, queryConfig, blockConfig) {
  const { fetchDataFunction, checkTakenFunction, dataVar, databaseVar, databaseValue } = queryConfig
  let blockVar
  let blockFunction
  let unblockFunction
  let blockedClass
  if (blockConfig) {
    ({ blockVar, blockFunction, unblockFunction, blockedClass } = blockConfig)
  }

  fetchDataFunction(input.value).then(data => {
    // fetching all taken data
    const { hasUntakenId, takenIds } = checkTakenFunction(input)
    if (blockConfig) {
      if (hasUntakenId) blockFunction(blockVar)      
    }

    queryOptions.innerHTML = ''
    data.forEach(option => {
      const optionElement = document.createElement('div')
      optionElement.innerHTML = option[databaseValue]
      optionElement.addEventListener('click', () => {
        queryOptions.innerHTML = ''
        input.dataset[dataVar] = option[databaseVar]
        input.value = option[databaseValue]
        input.classList.remove(blockedClass)

        if (blockConfig) {
          const { hasUntakenId } = checkTakenFunction(input)
          if (!hasUntakenId) unblockFunction(blockVar)
        }
      })

      // filtering taken options
      if (!takenIds.includes(option[databaseVar] + '')) {
        queryOptions.appendChild(optionElement)
      }
    })
  })
}
