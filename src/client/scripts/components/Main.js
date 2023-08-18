import React from 'react'

import '../../stylesheets/page.css'

function HeaderAside () {
  return (
    <div className='header--aside'>
      <img className='menu-img icon-img' src='menu.png' />
      <a className='logo' href='/'> Club Penguin Music Wiki </a>
    </div>
  )
}

function Searchbar () {
  return (
    <div className='searchbar'>
      <img src='search' />
      <input type='text' placeholder='Search Club Penguin Music' />
      <button> Search </button>
    </div>
  )
}

function UserArea () {
  return (
    <div>
      <img className='ellipsis-img icon-img' src='ellipsis.png' />
    </div>
  )
}

function Header () {
  return (
    <div className='header'>
      <HeaderAside />
      <Searchbar />
      <UserArea />
    </div>
  )
}

function Sidebar () {
  return (
    <div className='sidebar'>
      <a href='/'> Main Page </a>
      <a href='/Special:Recent_changes'> Recent Changes </a>
    </div>
  )
}

function Middle (props) {
  return (
    <div className='content'>
      <Sidebar />
      <div className='content--body'>
        <div className='page-title'> Main Page </div>
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
  return (
    <div>
      <Header />
      <Middle content={props.content} />
      <Footer />
    </div>
  )
}
