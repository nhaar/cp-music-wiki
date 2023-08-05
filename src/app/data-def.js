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
    names NAME[]
    authors SONG_AUTHOR[]
    link TEXT
    files SONG_FILE[]
    unofficialNames UNOFFICIAL_NAME[]
    swfMusicNumbers INT[]
    firstParagraph TEXT
    page TEXT
    keySignatures INT[]
    genres INT[]
    categories INT[]
    versions VERSION[]
    composedDate DATE_ESTIMATE
    externalReleaseDate DATE
    priority INT
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
    name QUERY
    open TIME_RANGE
    songUses SONG_APPEARANCE[]
  `),
  flash_party: new MainType(
    'Club Penguin Party', `
    name QUERY
    active TIME_RANGE
    partySongs PARTY_SONG[]
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
    name QUERY
    reference INT
    pt LOCALIZATION_NAME
    fr LOCALIZATION_NAME
    es LOCALIZATION_NAME
    de LOCALIZATION_NAME
    ru LOCALIZATION_NAME
  `),
  LOCALIZATION_NAME: new ObjectType(`
    name TEXT
    reference INT
    translationNotes TEXT
  `, [
    new Validator(
      o => ((!o.reference && !o.translationNotes) || o.name),
      'Localization name contains reference or translation notes but contains no actual name'
    )
  ]),
  UNOFFICIAL_NAME: new ObjectType(`
    name QUERY
    description TEXT
  `),
  SONG_AUTHOR: new ObjectType(`
    author INT
    reference INT
  `),
  VERSION: new ObjectType(`
    name TEXT
    description TEXT
  `),
  SONG_APPEARANCE: new ObjectType(`
    isUnused BOOLEAN
    available TIME_RANGE
    song INT
    reference INT
  `),
  PARTY_SONG: new ObjectType(`
    isUnused BOOLEAN
    type INT
    usePartyDate BOOLEAN
    available TIME_RANGE
    song INT
  `),
  CATALOGUE_ITEM: new ObjectType(`
    displayName TEXT
    song INT
  `),
  STAGE_APPEARANCE: new ObjectType(`
    isUnused BOOLEAN
    appearance TIME_RANGE
    song INT
    reference INT
  `),
  GAME_SONG: new ObjectType(`
    isUnused BOOLEAN
    song INT
    useMinigameDates BOOLEAN
    available TIME_RANGE
  `),
  VIDEO_APPEARANCE: new ObjectType(`
    song INT
    isEntireVideo BOOLEAN
    startTime INT
    endTime INT
  `),
  DATE_ESTIMATE: new ObjectType(`
    date DATE
    isEstimate BOOLEAN
  `),
  TIME_RANGE: new ObjectType(`
    start DATE_ESTIMATE
    end DATE_ESTIMATE
  `),
  SONG_FILE: new ObjectType(`
    source INT
    link TEXT
    isHQ BOOLEAN
    originalname TEXT
    filename TEXT
  `)
}, {
  epf_ost: new MainType(
    'Elite Penguin Force OST', `
    songs INT[]
  `),
  epfhr_ost: new MainType(
    "Herbert's Revenge OST", `
    songs INT[]
  `),
  game_day_ost: new MainType(
    'Game Day OST', `
    songs INT[]
  `)
}]

module.exports = def
