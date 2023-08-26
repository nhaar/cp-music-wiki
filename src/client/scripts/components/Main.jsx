import React, { useState } from 'react'

import '../../stylesheets/page.css'
import Menu from '../../images/menu.png'
import Arrow from '../../images/double-arrow.png'
import Search from '../../images/search.png'
import Ellipsis from '../../images/ellipsis-h.png'
import { getCookies, postAndGetJSON } from '../client-utils'
import SearchQuery from './SearchQuery'

function HeaderAside (props) {
  const imgPath = props.props.sidebar ? Arrow : Menu
  function click () {
    props.props.swapSidebar()
  }

  return (
    <div className='header--aside'>
      <img className='menu-img icon-img' src={imgPath} onClick={click} />
      <a className='logo' href='/'> Club Penguin Music Wiki </a>
    </div>
  )
}

function Searchbar () {
  const [query, setQuery] = useState('')

  async function getter (value) {
    return await postAndGetJSON('api/get-page-names', { keyword: value })
  }

  function updateFunction (data, callback) {
    data.forEach(callback)
  }

  function handleSearchClick () {
    window.location.href = `/${query}`
  }

  return (
    <div className='searchbar'>
      <img src={Search} />
      <SearchQuery placeholder='Search Club Penguin Music' getter={getter} iterateData={updateFunction} passInfo={setQuery} />
      <button onClick={handleSearchClick}> Search </button>
    </div>
  )
}

function UserArea () {
  const { username } = getCookies()

  const Element = username
    ? <a href='/'> {username} </a>
    : (
      <a href='/Special:UserLogin'>
        <img className='ellipsis-img icon-img' src={Ellipsis} />
      </a>
      )

  return (
    <div className='user-area'>
      {Element}
    </div>
  )
}

function Header (props) {
  return (
    <div className='header'>
      <HeaderAside props={{ ...props }} />
      <Searchbar />
      <UserArea />
    </div>
  )
}

function Sidebar (props) {
  return (
    <div className={`sidebar ${props.sidebar ? '' : 'hidden'}`}>
      <a href='/'> Main Page </a>
      <a href='/Special:RecentChanges'> Recent Changes </a>
      <a href='/Special:Items'> Item browser </a>
    </div>
  )
}

function Middle (props) {
  return (
    <div className='content'>
      <Sidebar sidebar={props.sidebar} />
      <div className='content--body'>
        <div className='page-title'> {props.title} </div>
        <div className='page-content-body'>
          <props.content arg={props.arg} />
        </div>
        {!props.arg.data || props.arg.data.categoryNames.length === 0
          ? <div />
          : (
            <div className='category--footer'>
              <div>
                Categories:
              </div>
              <div className='category--links'>
                {props.arg.data.categoryNames.map((name, i) => (
                  <a key={i} href={`/Category:${name}`}>
                    {name}
                  </a>
                ))}
              </div>
            </div>
            )}
      </div>
    </div>
  )
}

function Footer () {
  return (
    <div className='footer'>
      <small>Club Penguin Music Wiki Engine v{require('../../../../package.json').version}</small>
    </div>
  )
}

export default function Main (props) {
  const [sidebar, setSidebar] = React.useState(Number(getCookies().sidebar))

  if (isNaN(sidebar)) {
    const defaultValue = 1
    setSidebar(defaultValue)
    updateSidebarSetting(defaultValue)
  }

  function updateSidebarSetting (value) {
    document.cookie = `sidebar=${value ? '1' : '0'}`
  }

  function swapSidebar () {
    setSidebar(prev => {
      const cur = !prev
      updateSidebarSetting(cur)
      return cur
    })
  }

  return (
    <div>
      <Header swapSidebar={swapSidebar} sidebar={sidebar} />
      <Middle content={props.content} arg={props.arg} sidebar={sidebar} title={props.title} />
      <Footer />
    </div>
  )
}
