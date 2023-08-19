import React from 'react'

// element modules
// array modules
// editor module

function TextInputModule (props) {
  const getValue = value => value || ''
  const [value, setValue] = React.useState(() => getValue(props.value))

  React.useEffect(() => {
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
  const [array, setArray] = React.useState(props.value)

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

  return (
    <div>
      {array.map((element, i) => {
        function passValue (value) {
          setArray(a => {
            const newA = [...a]
            newA[i] = [value]
            return newA
          })
        }

        return (
          <div key={i}>
            <props.component value={element} passValue={passValue} />
            <button> MOVE </button>
            <button onClick={deleteRow(i)}> DELETE </button>
          </div>
        )
      })}
      <button onClick={addRow}>
        ADD
      </button>
    </div>
  )
}

function TableModule (props) {
  const [value, setValue] = React.useState(props.inputFunction)

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
  const [value, setValue] = React.useState({
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
