import React from 'react'
import ChangesList from './ChangesList'

/** Component for the watchlist page */
export default function Watchlist () {
  return (
    <ChangesList
      route='api/get-watchlist'
      text='Track the changes to the items in your watchlist.'
    />
  )
}
