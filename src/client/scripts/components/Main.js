import React from 'react'

function Header () {
  return (
    <div />
  )
}

function Sidebar () {
  return (
    <div />
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
    <div />
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
