import React from 'react'

import { postAndGetJSON } from '../client-utils'
import '../../stylesheets/query.css'

import SearchQuery from './SearchQuery'

export default function QueryInput (props) {
  async function setText () {
    if (props.id) {
      const { name } = await postAndGetJSON('api/get-name', { cls: props.cls, id: Number(props.id) })
      return name
    } else return ''
  }

  function updateFunction (data, callback) {
    for (const id in data) {
      callback(data[id], Number(id))
    }
  }

  async function getter (value) {
    return await postAndGetJSON('api/get-by-name', { cls: props.cls, keyword: value, withDeleted: props.withDeleted })
  }

  function passInfo (name, id) {
    props.passInfo(id, name)
  }

  return (
    <SearchQuery text={setText} iterateData={updateFunction} getter={getter} passInfo={passInfo} />
  )
}
