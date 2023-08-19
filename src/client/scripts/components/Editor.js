import React, { useEffect, useState } from 'react'

// element modules
// array modules
// editor module

function TextInputModule (props) {
  const getValue = value => value || ''
  const [value, setValue] = useState(() => getValue(props.value))

  useEffect(() => {
    setValue(getValue(props.value))
  }, [props.value])

  function updateValue (e) {
    const { value } = e.target
    setValue(value)
    props.passValue(value || null)
  }

  return (
    <input value={value} type='text' onChange={updateValue} />
  )
}

function MoveableRowsModule (props) {
  const [array, setArray] = useState(props.value)
  const [isMoving, setIsMoving] = useState(false)
  const [originalPos, setOriginalPos] = useState(-1)

  function deleteRow (i) {
    return () => {
      setArray(a => {
        const newA = [...a]
        newA.splice(i, 1)
        return newA
      })
    }
  }

  function addRow () {
    setArray(a => [...a, null])
  }

  function clickMove (i) {
    return () => {
      console.log('clicked', i)
      setIsMoving(true)
      setOriginalPos(i)
    }
  }

  function finishMove (i) {
    return () => {
      console.log(isMoving, i)
      if (isMoving) {
        setArray(a => {
          const newA = [...a]
          const removed = newA.splice(originalPos, 1)
          newA.splice(i, 0, ...removed)
          console.log(newA)
          return newA
        })
      }
    }
  }

  const components = array.map((element, i) => {
    function passValue (value) {
      setArray(a => {
        const newA = [...a]
        newA[i] = [value]
        return newA
      })
    }

    return (
      <div key={i} onMouseUp={finishMove(i)}>
        <props.component value={element} passValue={passValue} />
        <button onMouseDown={clickMove(i)}> MOVE </button>
        <button onClick={deleteRow(i)}> DELETE </button>
      </div>
    )
  })

  return (
    <div>
      {components}
      <button onClick={addRow}>
        ADD
      </button>
    </div>
  )
}

function TableModule (props) {
  const [value, setValue] = useState(props.inputFunction)

  const components = []
  props.declrs.forEach((declr, i) => {
    function passValue (value) {
      setValue(v => {
        const newV = { ...v }
        newV[declr.property] = value
        props.passValue(newV)
        return newV
      })
    }
    components.push(
      <div key={i}>
        <div> {declr.header} </div>
        <declr.Component value={value[declr.property]} passValue={passValue} component={declr.component} />
      </div>
    )
  })

  return (
    <div>
      {components}
    </div>
  )
}

// function getModule (children, inputFunction, outputFunction) {
//   return () => {

//     return (
//       <div>
//         {children.map(Child => {
//           return <Child />
//         })}
//       </div>
//     )
//   }
// }

export default function Editor (props) {
  const [value, setValue] = useState({
    hello: [
      'lklkk',
      'oi',
      'movie',
      'a',
      'b',
      'huehuehuehue',
      'mi anigo'
    ],
    'world!': null
  })
  // const EditorModule = constructEditorModule(props.args.row)

  const declrs = [
    {
      property: 'hello',
      Component: MoveableRowsModule,
      header: 'world!',
      component: TextInputModule
    },
    {
      property: 'world!',
      Component: TextInputModule,
      header: 'hello!'
    }
  ]

  function inputFunction () {
    return value
  }

  function passValue (value) {
    setValue[value]
  }

  return (
    <TableModule declrs={declrs} inputFunction={inputFunction} passValue={passValue} />

  )
}
