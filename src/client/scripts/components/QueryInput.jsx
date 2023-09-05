import React from 'react'

import { postAndGetJSON } from '../client-utils'
import '../../stylesheets/query.css'

import SearchQuery from './SearchQuery'

export default function QueryInput ({ id, cls, withDeleted, passInfo }) {
  async function setText () {
    if (id) {
      const { name } = await postAndGetJSON('api/get-name', { cls, id: Number(id) })
      return name
    } else return ''
  }

  function updateFunction (data, callback) {
    for (const id in data) {
      callback(data[id], Number(id))
    }
  }

  async function getter (value) {
    return await postAndGetJSON('api/get-by-name', { cls, keyword: value, withDeleted })
  }

  function passInfoUp (name, id) {
    passInfo(id, name)
  }

  return (
    <SearchQuery text={setText} iterateData={updateFunction} getter={getter} passInfo={passInfoUp} />
  )
}
