import { EditorModel, EditorView, EditorController, EditorType } from './editor-class.js'
import { OrderedRowsElement } from './ordered-rows.js'
import { createSearchQuery } from './query-options.js'
import { createElement, selectElements } from './utils.js'

/**
 * @typedef {object} FlashRoomData
 * @property {number} roomId
 * @property {string} name
 * @property {string} releaseDate
 * @property {boolean} isReleaseEstimate
 * @property {string} closureDate
 * @property {boolean} isClosureEstimate
 * @property {SongUse[]} songUses
 */

/**
 * @typedef {object} SongUse
 * @property {string} startDate
 * @property {boolean} isStartEstimate
 * @property {string} endDate
 * @property {boolean} isEndEstimate
 * @property {number} songId
 */

class FlashRoomModel extends EditorModel {
  constructor () { super('flash-room', { songUses: [] }) }
}

class FlashRoomView extends EditorView {
  buildEditor (data) {
    console.log(data)
    this.nameInput = createElement({ parent: this.editor, tag: 'input' })
    this.releaseInput = createElement({ parent: this.editor, tag: 'input', type: 'date' })
    this.releaseCheckbox = createElement({ parent: this.editor, tag: 'input', type: 'checkbox' })
    this.closureInput = createElement({ parent: this.editor, tag: 'input', type: 'date' })
    this.closureCheckbox = createElement({ parent: this.editor, tag: 'input', type: 'checkbox' })
    this.usesDiv = new OrderedRowsElement('uses-div', 'uses', `
      <input>
      <input type="date">
      <input type="checkbox">
      <input type="date"> 
      <input type="checkbox">
    `)
    this.usesDiv.renderElement(this.editor)
  }
}

class FlashRoomController extends EditorController {
  setupEditor () {
    this.view.usesDiv.setupAddRow(
      template => {
        createSearchQuery(
          template.children[0],
          'songId',
          'song_id',
          'name_text',
          x => this.model.getSongNames(x)
        )
      },
      row => {
        const data = {
          songName: row.children[0].value,
          songId: row.children[0].dataset.songId,
          dateStart: row.children[1].value,
          isStartEstimate: row.children[2].checked,
          dateEnd: row.children[3].value,
          isEndEstimate: row.children[4].value
        }

        return data
      }, (element, data) => {
        element.innerHTML = `
          <input value="${data.songName}" data-song-id="${data.songId}">
          <input type="date" value="${data.dateStart}">
          <input type="checkbox" checked="${data.isStartEstimate}">
          <input type="date" value="${data.dateEnd}"> 
          <input type="checkbox" checked="${data.isEndEstimate}">
          <input type="checkbox">
        `

        element.parentElement.dataset.sorter = Date.parse(data.dateStart)
      }, x => {
        console.log(x)
        return Number(Date.parse(x.children[0].children[1].value))
      }
    )
  }

  getUserData () {
    const name = this.view.nameInput.value
    const releaseDate = this.view.releaseInput.value
    const isReleaseEstimate = this.view.releaseCheckbox.checked
    const closureDate = this.view.closureInput.value
    const isClosureEstimate = this.view.closureCheckbox.checked
    const songUses = []
    const rows = selectElements(this.view.usesDiv.rowClass, this.view.usesDiv.div)
    rows.forEach(row => {
      const content = row.children[0].children
      const songId = content[0].dataset.songId
      const startDate = content[1].value
      const isStartEstimate = content[2].checked
      const endDate = content[3].value
      const isEndEstimate = content[4].checked
      const isUnused = content[5].checked
      songUses.push({ songId, isUnused, startDate, isStartEstimate, endDate, isEndEstimate })
    })

    console.log(songUses)
    return { roomId: this.model.id, name, releaseDate, isReleaseEstimate, closureDate, isClosureEstimate, songUses }
  }
}

export class FlashRoom extends EditorType {
  constructor (id) { super(id, FlashRoomModel, FlashRoomView, FlashRoomController) }
}
