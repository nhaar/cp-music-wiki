function getName (querywords) {
  return querywords && querywords.match('^.*(&|$)')[0]
}

function formatCookies (str) {
  const matches = str.match(/\w+=\w+(?=($|;))/g)
  const cookies = {}
  if (matches) {
    matches.forEach(match => {
      const words = match.match(/\w+/g)
      cookies[words[0]] = words[1]
    })
  }

  return cookies
}

const MIN_PASSWORD_LENGTH = 8

module.exports = { getName, formatCookies, MIN_PASSWORD_LENGTH }
