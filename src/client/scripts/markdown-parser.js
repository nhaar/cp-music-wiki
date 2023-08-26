class MarkdownParser {
  constructor (text) {
    Object.assign(this, { text })

    this.blocks = []
  }

  blockenize (text, start, ...objects) {
    let i = 0
    const segments = []
    let iterations = 0
    while (i < text.length) {
      iterations++
      if (iterations > 1000000) throw new Error('Stopped to prevent infinite loop')
      const match = text.substring(i).match(start)
      if (!match) break
      const [chars] = match
      for (let j = 0; j < objects.length; j++) {
        const object = objects[j]
        if (j === objects.length - 1 || object.condition(chars)) {
          const initial = text.substring(i + match.index).match(object.pattern)[0]
          segments.push(object.callback(initial, chars))

          i += match.index + initial.length
          break
        }
      }
    }
    return segments
  }

  parse () {
    this.blocks = this.blockenize(this.text, /={2,6}|\S/, {
      condition (c) { return c.match(/^={2,6}$/) },
      pattern: /(?<=([^=]|^))={2,6}[^=]*?={2,6}(?=([^=]|$))/,
      callback (initial) {
        const text = initial.match(/(?<==)[^=]+(?==)/)[0]

        const depth = Math.floor(initial.match(/=/g).length / 2)
        return {
          type: `h${depth}`, text
        }
      }
    }, {
      pattern: /[\s\S]*?(?=\n.*?\n|={2,6}|$)/,
      callback (initial) {
        return { type: 'p', text: initial }
      }
    })

    this.blocks.forEach((block, i) => {
      this.blocks[i].text = this.blockenize(block.text, /\[{1,2}|(\s*[^[\]])/, {
        condition (c) { return c === '[' },
        pattern: /\[.*?\]/,
        callback (initial) {
          const url = initial.match(/(?<=\[)\S+/)[0]
          const content = initial.match(/(?<=\s).*(?=\])/)[0]
          return {
            type: 'hyperlink',
            url,
            text: content
          }
        }
      }, {
        condition (c) { return c === '[[' },
        pattern: /\[\[[^[\]]+?\]\]/,
        callback (initial) {
          return {
            type: 'wikilink',
            page: initial.match(/(?<=\[)[^[\]]+(?=\])/)[0]
          }
        }
      }, {
        pattern: /[\s\S]*?(?=\[|$)/,
        callback (initial) {
          return {
            type: 'text',
            text: initial
          }
        }
      })
    })

    return this.blocks
  }
}

module.exports = MarkdownParser
