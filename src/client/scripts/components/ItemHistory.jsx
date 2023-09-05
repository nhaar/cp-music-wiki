import React from 'react'
import ChangesList from './ChangesList'

/** Component for showing an item's history */
export default function ItemHistory ({ item }) {
  return (
    <ChangesList route={`api/item-history?id=${item}`} />
  )
}
