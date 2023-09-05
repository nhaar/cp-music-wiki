import React from 'react'
import ChangesList from './ChangesList'
import EditorHeader from './EditorHeader'

/** Component for showing an item's history */
export default function ItemHistory ({ item, isStatic, deleted, predefined }) {
  return (
    <div>
      <EditorHeader {...{ cur: 2, isStatic, id: item, deleted, predefined }} />
      <ChangesList route={`api/item-history?id=${item}`} />
    </div>
  )
}
