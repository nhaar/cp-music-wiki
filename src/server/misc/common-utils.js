module.exports = {
  getName (querywords) {
    return querywords && querywords.match('^.*(&|$)')[0]
  },
  formatCookies (str) {
    const matches = str.match(/\w+=\w+(?=($|;))/g)
    const cookies = {}
    if (matches) {
      matches.forEach(match => {
        const words = match.match(/\w+/g)
        cookies[words[0]] = words[1]
      })
    }

    return cookies
  },
  MIN_PASSWORD_LENGTH: 8
}
