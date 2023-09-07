import React from 'react'
import ChangesList from './ChangesList'

/** Component for the recent changes page */
export default function RecentChanges () {
  return (
    <ChangesList
      route='api/recent-changes'
      text='Track the most recent changes to the wiki on this page.'
    />
  )
}
