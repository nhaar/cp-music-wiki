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

  validate (type, data) {
    const validator = new DataValidator(this)
    return validator.validate(type, data)
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

 

  assignDefaults (code) {
    this.defaults = {}
    const standardVariables = ['TEXT', 'INT', 'BOOLEAN', 'DATE']
    this.standardVariables = standardVariables
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

class DataValidator {
  constructor (db) {
    this.db = db
  }

  validate (type, data) {
    this.errors = []
    this.iterateObject(type, data, [`[${type} Object]`])
    return this.errors
  }

  iterateObject = (type, data, path) => {
    const code = this.db.vars[type]
    const definitions = code.split('\n').filter(line => !line.includes('{') && !line.includes('}'))
      .map(line => line.trim())
    definitions.forEach((def, i) => {
      if (def.includes('=>')) {
        // am unsure of a simple replacement for this eval
        // without making a custom minilanguage
        if (!eval(def.replace(/=>/, '').replace(/\$/g, 'data.'))) {
          this.errors.push(definitions[i + 1].replace(/:/, '').trim())
        }
      } else if (!def.includes(':')) {
        const names = def.match(/\w+(\[\])*/g)
        const property = names[0]
        const type = names[1]
        this.checkType(data[property], type, path.concat([`.${property}`]))
        
      }
    })
  }

  checkType = (value, type, path) => {
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
              this.checkType(array[i], realType, newPath)
            } else {
              dimensionIterator(array[i], level - 1)
            }
          }
        } else {
          this.errors.push(`${path.join('')} is not an array`)
        }                
      }
      dimensionIterator(value, dimension)
    } else {
      const errorMsg = indefiniteDescription => this.errors.push(`${path.join('')} must be ${indefiniteDescription}`)

      if (this.db.standardVariables.includes(type)) {
        if (value === null) return


        if (type === 'TEXT') {
          if (typeof value !== 'string') {
            errorMsg('a text string')
          }
        } else if (type === 'INT') {
          if (!Number.isInteger(value)) {
            errorMsg('an integer number')
          }
        }  else if (type === 'BOOLEAN') {
          if (typeof value !== 'boolean') {
            errorMsg('a boolean value')
          } else if (type === 'DATE') {
            if (!value.match(/\d+-\d{2}-\d{2}/)) {
              errorMsg('a valid date string (YYYY-MM-DD)')
            }
          }
        }
      } else {
        if (!value) errorMsg('a valid object')
        else this.iterateObject(`*${type}`, value, path)
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
  : A song must have at least one name or one unofficial name
  => $link === '' || $link.includes('youtube.com/watch&v=') || $link.includes('youtu.be/')
  : A song link must be a valid YouTube link
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
  : A song name must contain a non empty text for its name
}

*LOCALIZATION_NAME: {
  name TEXT
  reference INT
  translationNotes TEXT
  => ($reference || $translationNotes) && $name || (!$reference && !$translationNotes && !$name)
  : Localization name contains reference or translation notes but contains no actual name
}

*SONG_AUTHOR: {
  author INT
  reference INT
}

author: {
  name TEXT
  => $name
  : Author must have a non empty name
}
`
)

console.log(db.validate('song', {
  names: [
    {
      name: 'hello'
    }
  ],
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
