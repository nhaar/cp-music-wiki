import React from 'react'

function HeaderAside () {
  return (
    <div>
      <img src='menu.png' />
      <a href='/'> Club Penguin Music Wiki </a>
    </div>
  )
}

function Searchbar () {
  return (
    <div>
      <input type='text' placeholder='Search Club Penguin Music' />
      <button> Search </button>
    </div>
  )
}

function UserArea () {
  return (
    <div>
      <img src='ellipsis.png' />
    </div>
  )
}

function Header () {
  return (
    <div>
      <HeaderAside />
      <Searchbar />
      <UserArea />
    </div>
  )
}

function Sidebar () {
  return (
    <div>
      <a href='/'> Main Page </a>
      <a href='/Special:Recent_changes'> Recent Changes </a>
    </div>
  )
}

function Middle (props) {
  return (
    <div>
      <Sidebar />
      <props.content />
    </div>
  )
}

function Footer () {
  return (
    <div>
      Club Penguin Music Wiki Engine v{require('../../../../package.json').version}
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
