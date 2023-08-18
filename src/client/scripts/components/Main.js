import React from 'react'

import '../../stylesheets/page.css'
import Menu from '../../images/menu.png'
import Arrow from '../../images/double-arrow.png'
import Search from '../../images/search.png'
import Ellipsis from '../../images/ellipsis-h.png'
import { getCookies } from '../utils'

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
  return (
    <div className='searchbar'>
      <img src={Search} />
      <input type='text' placeholder='Search Club Penguin Music' />
      <button> Search </button>
    </div>
  )
}

function UserArea () {
  return (
    <div>
      <a href='/Special:UserLogin'>
        <img className='ellipsis-img icon-img' src={Ellipsis} />
      </a>
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
      <a href='/Special:Recent_changes'> Recent Changes </a>
    </div>
  )
}

function Middle (props) {
  return (
    <div className='content'>
      <Sidebar sidebar={props.sidebar} />
      <div className='content--body'>
        <div className='page-title'> {props.title} </div>
        <props.content />
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
      <Middle content={props.content} sidebar={sidebar} title={props.title} />
      <Footer />
    </div>
  )
}
