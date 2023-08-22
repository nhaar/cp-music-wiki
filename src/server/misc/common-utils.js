function getName (querywords) {
  return querywords && querywords.match('^.*(&|$)')[0]
}

module.exports = { getName }
