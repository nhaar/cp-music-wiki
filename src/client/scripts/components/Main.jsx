import React, { useEffect, useState } from 'react'

import '../../stylesheets/page.css'
import Menu from '../../images/menu.png'
import Arrow from '../../images/double-arrow.png'
import Search from '../../images/search.png'
import Ellipsis from '../../images/ellipsis-h.png'
import UserIcon from '../../images/user-icon.png'
import ArrowDown from '../../images/arrow-down.png'
import Logout from '../../images/logout.png'
import Login from '../../images/login.png'
import { getCookies, postAndGetJSON } from '../client-utils'
import SearchQuery from './SearchQuery'

function HeaderAside ({ sidebar, swapSidebar }) {
  const imgPath = sidebar ? Arrow : Menu
  function click () {
    swapSidebar()
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

function UserArea ({ user }) {
  const [showOptions, setShowOptions] = useState(false)

  function toggleOptions () {
    setShowOptions(!showOptions)
  }

  function isChild (posChild, posParent) {
    let transverser = posChild
    while (transverser.parentElement) {
      if (transverser.parentElement === posParent) return true
      transverser = transverser.parentElement
    }
    return false
  }

  useEffect(() => {
    window.addEventListener('click', e => {
      const parentSelectors = [
        '.user-options',
        '.user-imgs',
        '.ellipsis-img'
      ]

      let valid = false
      parentSelectors.forEach(selector => {
        const element = document.querySelector(selector)
        if (e.target === element || isChild(e.target, element)) valid = true
      })

      if (!valid) setShowOptions(false)
    })
  }, [])

  const Element = user
    ? (
      <div>
        <a href='/'> {user.user} </a>
        <div className='user-imgs' onClick={toggleOptions}>
          <img src={UserIcon} className='user-icon' />
          <img src={ArrowDown} className='user-arrow' />
        </div>
        {showOptions
          ? (
            <div className='user-options'>
              <a href='/Special:UserLogout'>
                <img src={Logout} className='logout-img' />
                <span>Log out</span>
              </a>
            </div>
            )
          : undefined}
      </div>
      )
    : (
      <div>
        <a href='/Special:CreateAccount'>Create an account</a>
        <img className='ellipsis-img icon-img' src={Ellipsis} onClick={toggleOptions} />
        {showOptions
          ? (
            <div className='user-options'>
              <a href='/Special:UserLogin'>
                <img src={Login} className='login-img' />
                <span>Log in</span>
              </a>
            </div>
            )
          : undefined}
      </div>
      )

  return (
    <div className='user-area'>
      {Element}
    </div>
  )
}

function Header ({ swapSidebar, sidebar, user }) {
  return (
    <div className='header'>
      <HeaderAside {...{ swapSidebar, sidebar }} />
      <Searchbar />
      <UserArea {...{ user }} />
    </div>
  )
}

function Sidebar ({ sidebar }) {
  return (
    <div className={`sidebar ${sidebar ? '' : 'hidden'}`}>
      <a href='/'> Main Page </a>
      <a href='/Special:RecentChanges'> Recent Changes </a>
      <a href='/Special:Items'> Item browser </a>
      <a href='/Special:Random'> Random page </a>
    </div>
  )
}

function Middle ({ Content, sidebar, title, arg }) {
  return (
    <div className='content'>
      <Sidebar sidebar={sidebar} />
      <div className='content--body'>
        <div className='page-title'> {title} </div>
        <div className='page-content-body'>
          <Content {...arg} />
        </div>
        {!arg || !arg.data || arg.data.categoryNames.length === 0
          ? <div />
          : (
            <div className='category--footer'>
              <div>
                Categories:
              </div>
              <div className='category--links'>
                {arg.data.categoryNames.map((name, i) => (
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

export default function Main ({ Content, arg, title, user }) {
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
      <Header {...{ swapSidebar, sidebar, user }} />
      <Middle {...{ Content, arg, title, sidebar }} />
      <Footer />
    </div>
  )
}
