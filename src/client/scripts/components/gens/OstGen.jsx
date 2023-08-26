import React from 'react'
import '../../../stylesheets/ost-list.css'

export default function OstGen (props) {
  const grid = [
    <tr key={-1}>
      <th>Name</th>
      <th>Author(s)</th>
      <th>Order</th>
      <th>Link</th>
      <th>{props.arg.data.isSeries ? 'HQ source(s)' : 'Related to'}</th>
      <th>Alternate Names</th>
      <th>{props.arg.data.isSeries ? 'Medias' : 'HQ Source(s)'}</th>
      <th>Earliest Date</th>
    </tr>
  ].concat(props.arg.data.rows.map((row, i) => {
    const { nameInfo, authors, order, link, related, sources, date, altNames } = row
    const [name, isOfficial] = nameInfo
    const lastSwapper = [sources.length === 0 ? 'None' : sources.join(' + '), related || '?']
    const seriesIndex = props.arg.data.isSeries ? 0 : 1

    return (
      <tr key={i}>
        <td className={isOfficial
          ? 'official-name'
          : 'unofficial-name'}
        >
          {name}
        </td>
        <td>{authors.length === 0 ? '?' : authors.join(', ')}</td>
        <td>
          {order}
        </td>
        <td>
          {link
            ? (
              <a href={link}>
                Link
              </a>
              )

            : <div />}
        </td>

        <td>{lastSwapper[seriesIndex]}</td>
        <td>{altNames}</td>
        <td>{lastSwapper[(seriesIndex + 1) % 2]}</td>
        <td>
          {date || '?'}
        </td>
      </tr>
    )
  }))

  return (
    <table className='ost-list'>
      <tbody>
        {grid}
      </tbody>
    </table>
  )
}
