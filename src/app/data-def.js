/**
 * Class that handles validating data within an object type
 */
class Validator {
  /**
   *
   * @param {function(TypeData) : boolean} f - Takes as argument an object that follows an object type's structure, and returns true if the object is following the rule assigned to this validator, else it returns false, indicating the data is not valid
   * @param {string} msg - Error message to display for the data if it is invalid
   */
  constructor (f, msg) {
    Object.assign(this, { f, msg })
  }
}

/**
 * General class for a database or property type
 */
class ObjectType {
  /**
   * Assigns both values to the object
   * @param {CPT} code - The code snippet which contains the declaration for all properties within this object type
   * @param {Validator[]} validators - A list of all data validators for this object type
   */
  constructor (code, validators = []) {
    Object.assign(this, { code, validators })
  }
}

class MainType {
  constructor (name, code, validators = []) {
    Object.assign(this, { name, code, validators })
  }
}

const def = [{
  song: new MainType(
    'Song',
    `
    names {NAME}[] "Names"
    authors {SONG_AUTHOR}[] "Authors"
    link TEXTSHORT "Link"
    files {SONG_FILE}[] "Files"
    unofficialNames {UNOFFICIAL_NAME}[] "Unofficial Names"
    swfMusicNumbers INT[] "SWF Numbers"
    firstParagraph TEXTLONG "First Paragraph"
    page TEXTLONG "Page"
    keySignatures ID(key_signature)[] "Key Signatures"
    genres ID(genre)[] "Genres"
    categories ID(category)[] "Categories"
    versions {VERSION}[] "Versions"
    composedDate {DATE_ESTIMATE} "Composed Date"
    externalReleaseDate DATE "External Release Date"
    priority INT "Priority"
  `, [
      new Validator(
        o => o.names.length > 0 || o.unofficialNames.length > 0,
        'A song must have at least one name or one unofficial name'
      ),
      new Validator(
        o => o.link === '' || o.link.includes('youtube.com/watch?v=') || o.link.includes('youtu.be/'),
        'A song link must be a valid YouTube link'
      )
    ]),
  author: new MainType(
    'Author', `
    name TEXTSHORT QUERY "Name"
  `),
  source: new MainType(
    'Source', `
    name TEXTSHORT QUERY "Name"
  `),
  wiki_reference: new MainType(
    'Wiki Reference', `
    name TEXTSHORT QUERY "Name"
    link TEXTSHORT "Link"
    description TEXTLONG "Description"
  `),
  genre: new MainType(
    'Music Genre', `
    name TEXTSHORT QUERY "Name"
    link TEXTSHORT "Link"
  `),
  instrument: new MainType(
    'Musical Instrument', `
    name TEXTSHORT QUERY "Name"
    link TEXTSHORT "Link"
  `),
  key_signature: new MainType(
    'Key Signature', `
    name TEXTSHORT QUERY "Name"
    link TEXTSHORT "Link"
  `),
  page: new MainType(
    'Page', `
    name TEXTSHORT QUERY "Name"
    content TEXTLONG "Content"
    categories ID(category)[] "Categories"
  `),
  category: new MainType(
    'Category', `
    name TEXTSHORT QUERY "Name"
  `),
  flash_room: new MainType(
    'Club Penguin Room', `
    name TEXTSHORT QUERY "Name"
    open {TIME_RANGE} "Open"
    songUses {SONG_APPEARANCE}[] "Song Uses"
  `),
  flash_party: new MainType(
    'Club Penguin Party', `
    name TEXTSHORT QUERY "Name"
    active {TIME_RANGE} "Active"
    partySongs {PARTY_SONG}[] "Songs"
  `),
  music_catalogue: new MainType(
    'Music Catalogue', `
    name QUERY
    description TEXT
    launch DATE_ESTIMATE
    songs CATALOGUE_ITEM[][]
    reference INT
  `),
  stage_play: new MainType(
    'Stage Play', `
    name QUERY
    song INT
    appearances STAGE_APPEARANCE[]
  `),
  flash_minigame: new MainType(
    'Club Penguin Minigame', `
    name QUERY
    available TIME_RANGE
    songs GAME_SONG[]
  `),
  flash_misc: new MainType(
    'Miscelaneous Club Penguin', `
    isUnused BOOLEAN
    name QUERY
    description TEXT
    available TIME_RANGE
    song INT
  `),
  penguin_chat_appearance: new MainType(
    'Miscelaneous Penguin Chat', `
    name QUERY
    description TEXT
    song INT
    available TIME_RANGE
  `),
  exclusive_app_appearance: new MainType(
    'Miscelaneous Mobile App', `
    song INT
    name QUERY
    description TEXT
    available TIME_RANGE
  `),
  youtube_video: new MainType(
    'Youtube Video', `
    name QUERY
    publish_date DATE
    appearances VIDEO_APPEARANCE[]
  `),
  tv_video: new MainType(
    'TV Video', `
    name QUERY
    earliest DATE_ESTIMATE
    appearance VIDEO_APPEARANCE[]
  `),
  industry_release: new MainType(
    'Industry Release', `
    release DATE
    songs INT[]
  `),
  screenhog_comission: new MainType(
    'Screenhog Comission', `
    comissioner TEXT
    projectName TEXT
    projectDescription TEXT
    songs INT[]
    available DATE_ESTIMATE
  `)
}, {
  NAME: new ObjectType(`
    name TEXTSHORT QUERY "Name"
    reference ID(wiki_reference) "Reference"
    pt {LOCALIZATION_NAME} "Portuguese"
    fr {LOCALIZATION_NAME} "French"
    es {LOCALIZATION_NAME} "Spanish"
    de {LOCALIZATION_NAME} "German"
    ru {LOCALIZATION_NAME} "Russian"
  `),
  LOCALIZATION_NAME: new ObjectType(`
    name TEXTSHORT "Name"
    reference ID(wiki_reference) "Reference"
    translationNotes TEXTLONG "Translation Notes"
  `, [
    new Validator(
      o => ((!o.reference && !o.translationNotes) || o.name),
      'Localization name contains reference or translation notes but contains no actual name'
    )
  ]),
  UNOFFICIAL_NAME: new ObjectType(`
    name TEXTSHORT QUERY "Name"
    description TEXTLONG "Description"
  `),
  SONG_AUTHOR: new ObjectType(`
    author ID(author) "Author"
    reference ID(wiki_reference) "Reference"
  `),
  VERSION: new ObjectType(`
    name TEXTSHORT "Name"
    description TEXTLONG "Description"
  `),
  SONG_APPEARANCE: new ObjectType(`
    isUnused BOOLEAN "Is Unused?"
    available {TIME_RANGE} "Available"
    song ID(song) "Song"
    reference ID(reference) "Reference"
  `),
  PARTY_SONG: new ObjectType(`
    isUnused BOOLEAN "Is unused?"
    type INT "Type"
    usePartyDate BOOLEAN "Use date from the party?"
    available {TIME_RANGE} "Available"
    song ID(song) "Song"
  `),
  CATALOGUE_ITEM: new ObjectType(`
    displayName TEXTSHORT "Display Name"
    song ID(song) "Song"
  `),
  STAGE_APPEARANCE: new ObjectType(`
    isUnused BOOLEAN "Is unused?"
    appearance {TIME_RANGE} "Appearance"
    song ID(song) "Song"
    reference ID(reference) "Reference"
  `),
  GAME_SONG: new ObjectType(`
    isUnused BOOLEAN "Is unused"
    song ID(song) "Song"
    useMinigameDates BOOLEAN "Use Minigame Dates"
    available {TIME_RANGE} "Available"
  `),
  VIDEO_APPEARANCE: new ObjectType(`
    song ID(song) "Song"
    isEntireVideo BOOLEAN "Is Entire Video?"
    startTime INT "Start Time"
    endTime INT "End Time"
  `),
  DATE_ESTIMATE: new ObjectType(`
    date DATE "Date"
    isEstimate BOOLEAN "Is Estimate?"
  `),
  TIME_RANGE: new ObjectType(`
    start {DATE_ESTIMATE} "Start"
    end {DATE_ESTIMATE} "End"
  `),
  SONG_FILE: new ObjectType(`
    source ID(source) "Source"
    link TEXTSHORT "Link"
    isHQ BOOLEAN "Is HQ?"
    file FILE(audio) "File"
  `)
}, {
  epf_ost: new MainType(
    'Elite Penguin Force OST', `
    songs ID(song)[]
  `),
  epfhr_ost: new MainType(
    "Herbert's Revenge OST", `
    songs ID(song)[]
  `),
  game_day_ost: new MainType(
    'Game Day OST', `
    songs ID(song)[]
  `)
}]

module.exports = def
