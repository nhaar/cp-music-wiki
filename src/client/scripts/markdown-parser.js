/** Objects that contain properties to define an HTML element. The properties vary on the exact element */
class BlockElement {}

/** Define an element with only text in it */
class TextElement extends BlockElement {
  /**
   * Create data
   * @param {string} type - Supported types: `text` defines a `span`, while the following define the same tag as their type: `h2`, `h3`, `h3`, `h4`, `h5`, `h6` and `p`
   * @param {string} text - Element's text
   */
  constructor (type, text) {
    super()
    Object.assign(this, { type, text })
  }
}

/** Define element that has a link to an outside URL */
class HyperlinkElement extends BlockElement {
  /**
   * Create data
   * @param {string} url - URL to link to
   * @param {string} text - Text for the hyperlink
   */
  constructor (url, text) {
    super()
    Object.assign(this, { type: 'hyperlink', url, text })
  }
}

/** Define element that has a link to a wiki page */
class WikilinkElement extends BlockElement {
  /**
   * Create data
   * @param {string} page - Name of page to link to
   */
  constructor (page) {
    super()
    Object.assign(this, { type: 'wikilink', page })
  }
}

/**
 * Class that defines an object that looks for a block of text and converts it into a specific `BlockElement`
 */
class BlockCreator {
  /**
   * Store the properties
   * @param {RegExp | string} pattern - `RegExp` pattern for what the markdown structure that defines the block looks like
   * @param {function(string) : BlockElement} callback - Function that takes as the argument the text that was matched by the `pattern` and returns the `BlockElement` that represents the HTML element
   * @param {function(string) : boolean} condition - Function that takes as the argument a piece of text that represents the beginning of a block, and returns `true` if the beginning of the block is compatible with this block, `false` otherwise
   */
  constructor (pattern, callback, condition) {
    Object.assign(this, { pattern, callback, condition })
  }
}

/** Responsible for converting the wiki's markdown to HTML */
class MarkdownParser {
  /**
   * Save text to instance
   * @param {string} text - Markdown text
   */
  constructor (text) {
    Object.assign(this, { text })

    this.blocks = []
  }

  /**
   * Convert markdown text into element blocks
   * @param {string} text - Markdown text
   * @param {RegExp | string} start - A `RegExp` pattern that matches the beginning for all possible different blocks. The idea is to run this continuously to get the "closest pattern that matches a block"
   * @param  {...BlockCreator} objects - Creator for all blocks possible to be found in the text
   * @returns {BlockElement[]} Array with all the block elements
   */
  static blockenize (text, start, ...objects) {
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

  /**
   * Parse the instance's markdown text, a process that consists of two steps:
   * * Breaking down the text into line blocks (elements that break line)
   * * Breaking down the text inside the line blocks into in-line blocks (elements within the line)
   * @returns {BlockElement[]} Final block elements representing the HTML text
   */
  parse () {
    this.blocks = MarkdownParser.blockenize(this.text, /={2,6}|\S/,
      new BlockCreator(
        /(?<=([^=]|^))={2,6}[^=]*?={2,6}(?=([^=]|$))/,
        i => new TextElement(`h${Math.floor(i.match(/=/g).length / 2)}`, i.match(/(?<==)[^=]+(?==)/)[0]),
        c => Boolean(c.match(/^={2,6}$/))
      ),
      new BlockCreator(
        /[\s\S]*?(?=\n.*?\n|={2,6}|$)/,
        i => ({ type: 'p', text: i })
      )
    )

    this.blocks.forEach((block, i) => {
      this.blocks[i].text = MarkdownParser.blockenize(block.text, /\[{1,2}|(\s*[^[\]])/,
        new BlockCreator(
          /\[.*?\]/,
          i => new HyperlinkElement(i.match(/(?<=\[)\S+/)[0], i.match(/(?<=\s).*(?=\])/)[0]),
          c => c === '['
        ),
        new BlockCreator(
          /\[\[[^[\]]+?\]\]/,
          i => new WikilinkElement(i.match(/(?<=\[)[^[\]]+(?=\])/)[0]),
          c => c === '[['
        ),
        new BlockCreator(
          /[\s\S]*?(?=\[|$)/,
          i => new TextElement('text', i)
        )
      )
    })

    return this.blocks
  }
}

module.exports = MarkdownParser
