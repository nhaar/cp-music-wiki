/* eslint no-eval: 0 */

const { Pool } = require('pg')
const pluralize = require('pluralize')

class WikiDatabase {
  constructor (code) {
    this.pool = new Pool({
      user: 'postgres',
      password: 'password',
      database: 'musicwiki',
      port: '5432'
    })

    this.assignDefaults(code)
  }

  async getDataById (name, id) {
    const result = await this.pool.query(`SELECT * FROM ${pluralize(name)} WHERE id = $1`, [id])
    return result.rows[0]
  }

  async updateType (name, row) {
    const id = row.id
    const data = JSON.stringify(row.data)
    const table = pluralize(name)
    if (!id) {
      await this.pool.query(`INSERT INTO ${table} (data) VALUES ($1)`, [data])
    } else {
      await this.pool.query(`UPDATE ${table} SET data = $1 WHERE id = $2`, [data, id])
    }
  }

  getDefault (type) {
    return this.defaults[type]
  }

  validate (type, data) {
    const errors = []

    const objectIterate = (type, data, path) => {
      const code = this.vars[type]
      const definitions = code.split('\n').filter(line => !line.includes('{') && !line.includes('}'))
        .map(line => line.trim())
      definitions.forEach((def, i) => {
        // data value validation through evaluation
        if (def.includes('=>')) {
          // am unsure of a simple replacement for this eval
          // without making a custom minilanguage
          if (!eval(def.replace(/=>/, '').replace(/\$/g, 'data.'))) {
            errors.push(definitions[i + 1].replace(/:/, '').trim())
          }
        } else if (!def.includes(':')) {
          const varAndType = def.match(/\w+(\[\])*/g)
          const variableName = varAndType[0]
          const type = varAndType[1]
          const checkType = (value, type, name, arrayLevel, path) => {
            console.log('ct', value, type, name, arrayLevel, path)
            if (type.includes('[')) {
              // figure out dimension
              const dimension = type.match(/\[\]/g).length
              const realType = type.slice(0, type.length - 2 * dimension)
              const dimensionIterator = (array, level) => {
                
                if (Array.isArray(array)) {
                  for (let i = 0; i < array.length; i ++) {
                    const newPath = JSON.parse(JSON.stringify(path))
                    newPath.push(`[${i}]`)
                    if (level === 1) {
                      checkType(array[i], realType, name, dimension, newPath)
                    } else {
                      dimensionIterator(array[i], level - 1)
                    }
                  }
                } else {
                  errors.push(`${path.join('')} is not an array`)
                }                
              }
              dimensionIterator(value, dimension)
            } else {
              if (type === 'TEXT') {
                if (typeof value !== 'string') {
                  errors.push(`${path.join('')} must be a text string`)
                }
              } else if (type === 'INT') {

                if (!Number.isInteger(value)) {
                  errors.push(`${path.join('')} must be an integer number`)
                }
              } else {
                const nextData = data[variableName]
                const iterateHere = (nextData, arrayLevel, indexPath) => {
                  if (arrayLevel === indexPath.length) {
                    if (nextData === undefined) errors.push(`${path.join('')} must a valid object`)
                    else objectIterate(`*${type}`, nextData, path)
                  } else {
                    iterateHere(nextData[indexPath[arrayLevel]], arrayLevel + 1, indexPath)
                  }
                }
                const indexPath = this.getPathIndex(path)
                iterateHere(nextData, 0, indexPath)
                

                // check if it matches object type (go back to the start)
              }
            }
              
          }
          if (data === undefined) {
            errors.push(`${path.join('')} must be a valid object`)
          } else {
            checkType(data[variableName], type, variableName, 0, path.concat(['.' + variableName]))
          }
        }
      })
    }

    objectIterate(type, data, [])

    return errors
  }

  getPathIndex (path) {
    const end = path.length - 1
    let startIndex
    for (let i = end; i >= 0; i--) {
      if (!path[i].includes('[')) {
        startIndex = i + 1
        break
      }
    }

    const copy = JSON.parse(JSON.stringify(path))
    return copy.splice(startIndex, end - startIndex + 1).map(value => Number(value.match(/\[(.*?)\]/)[1]))
  }

  pathConvert (path) {
    return 
  }

  assignDefaults (code) {
    this.defaults = {}
    const standardVariables = ['TEXT', 'INT']
    const dividedVariables = code.match(/\*\w+(?=:)|\w+(?=:)|\{([^}]+)\}/g)
    const vars = {}
    this.vars = vars
    if (dividedVariables.length % 2 === 1) throw new Error('Invalid variables')
    for (let i = 0; i < dividedVariables.length; i += 2) {
      vars[dividedVariables[i]] = dividedVariables[i + 1]
    }

    for (const v in vars) {
      if (!v.includes('*')) {
        const defaultObject = {}
        const iterate = (object, code) => {
          const definitions = code.split('\n').filter(line => !line.includes('{') && !line.includes('}') && !line.includes('=>') && !line.includes(':')).map(line => line.trim())
          definitions.forEach(def => {
            const varAndType = def.match(/\w+\[\]|\w+/g)
            const variableName = varAndType[0]
            const type = varAndType[1]
            if (type.includes('[')) object[variableName] = []
            else if (standardVariables.includes(type)) object[variableName] = null
            else {
              object[variableName] = {}
              iterate(object[variableName], vars[`*${type}`])
            }
          })
        }

        iterate(defaultObject, vars[v])

        this.defaults[v] = defaultObject
      }
    }
  }
}

const db = new WikiDatabase(
`
song: {
  names NAME[]
  authors SONG_AUTHOR[]
  link TEXT
  files INT[]
  unofficialNames TEXT[]
  => $names.length > 0 || $unofficialNames.length > 0
  : Needs to supply at least one name or one unofficial name
  => $link === '' || $link.includes('youtube.com/watch&v=') || $link.includes('youtu.be/')
  : Link is not a valid youtube video
}

*NAME: {
  name TEXT
  reference INT
  pt LOCALIZATION_NAME
  fr LOCALIZATION_NAME
  es LOCALIZATION_NAME
  de LOCALIZATION_NAME
  ru LOCALIZATION_NAME
  => $name
  : Name must be included in each new name
}

*LOCALIZATION_NAME: {
  name TEXT
  reference INT
  translationNotes TEXT
  => $name
  : Name must be included for each localization
}

*SONG_AUTHOR: {
  author INT
  reference INT
}

author: {
  name TEXT
  => name
  : Author must have a name
}
`
)

console.log(db.validate('song', {
  names: [],
  authors: [
    {
      author: 1,
      reference: 0  
    },
    {
      author: 1,
      reference: null
    }
  ],
  link: '',
  files: [],
  unofficialNames: [ 'hello' ]
}))

module.exports = db
