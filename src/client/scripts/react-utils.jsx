import React from 'react'

export function createWarning (isValid, text, i) {
  return isValid
    ? undefined
    : (
      <span
        key={i} style={{
          color: 'red'
        }}
      >* {text}
      </span>
      )
}
