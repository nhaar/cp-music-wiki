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

    const objectIterate = (type, data) => {
      const isArray = Array.isArray(data)
      const code = this.vars[type]
      const definitions = code.split('\n').filter(line => !line.includes('{') && !line.includes('}'))
        .map(line => line.trim())
      definitions.forEach((def, i) => {
        if (def.includes('=>')) {
          const limit = isArray ? data.length : 1
          for (let j = 0; j < limit; j++) {
            // am unsure of a replacement for this eval
            if (!eval(def.replace(/=>/, '').replace(/\$/g, '(isArray ? data[j] : data).'))) {
              errors.push(definitions[i + 1].replace(/:/, '').trim())
            }
          }
        } else if (!def.includes(':')) {
          const varAndType = def.match(/\w+\[\]|\w+/g)
          const variableName = varAndType[0]
          const type = varAndType[1]
          const checkType = (value, type, name, inArray = []) => {
            if (type.includes('[')) {
              // iterate through array and verify that the type is valid
              if (!Array.isArray(value)) {
                errors.push(`${name} must be an array`)
              } else {
                for (let i = 0; i < data[name].length; i++) {
                  let arr = data[name]
                  for (const index of inArray) {
                    arr = [inArray[index]]
                  }

                  checkType(arr[i], type.slice(0, type.length - 2), name, inArray.concat(i))
                }
              }
            } else if (type === 'TEXT') {
              if (typeof value !== 'string') {
                if (inArray.length) {
                  errors.push(`${name} must be an array of text strings`)
                } else {
                  errors.push(`${name} must be a text string`)
                }
              }
            } else if (type === 'INT') {
              if (!Number.isInteger(value)) {
                if (inArray.length) {
                  errors.push(`${name} must be an array of integer numbers`)
                } else {
                  errors.push(`${name} must be an integer number`)
                }
              }
            } else {
              if (isArray) {
                for (let i = 0; i < data.length; i++) {
                  const nextData = data[i][variableName]
                  if (nextData === undefined) errors.push(`${variableName} must a valid object`)
                  else objectIterate(`*${type}`, data[i][variableName])
                }
              } else {
                const nextData = data[variableName]
                if (nextData === undefined) errors.push(`${variableName} must a valid object`)
                else objectIterate(`*${type}`, data[variableName])
              }

              // check if it matches object type (go back to the start)
            }
          }
          if (data === undefined) {
            errors.push(`${variableName} must be a valid object`)
          } else {
            checkType(data[variableName], type, variableName)
          }
        }
      })
    }

    objectIterate(type, data)

    return errors
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
}
`
)

console.log(db.validate('song', {
  names: [
    {
      name: 'hey'
    }
  ],
  authors: [],
  link: '',
  unofficialNames: []
}))

module.exports = db
