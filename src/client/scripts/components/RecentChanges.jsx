import React from 'react'
import ChangesList from './ChangesList'

/** Component for the recent changes page */
export default function RecentChanges () {
  return (
    <ChangesList route='api/recent-changes' />
  )
}
