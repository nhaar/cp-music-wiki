/**
 * Class that handles validating data for a class
 */
class Validator {
  /**
   * @param {function(TypeData) : boolean} f - Takes as argument an object that follows a class data's structure, and returns true if the object is following the rule assigned to this validator, else it returns false, indicating the data is not valid
   * @param {string} msg - Error message to display for the data if it is invalid
   */
  constructor (f, msg) {
    Object.assign(this, { f, msg })
  }
}

/** Class for a database class definition */
class ClassDef {
  /**
   * Assigns both values to the object
   * @param {CPT} code - The code snippet which contains the declaration for all properties within the class
   * @param {Validator[]} validators - A list of all data validators for the class data
   */
  constructor (code, validators = []) {
    Object.assign(this, { code, validators })
  }
}

/** Class for a class definition that has a name (for main and static classes) */
class NameDef {
  constructor (name, code, validators = []) {
    Object.assign(this, { name, code, validators })
  }
}

/** Array with the three `DefMap`s for main, helper and static classes */
const def = [{
  song: new NameDef(
    'Song', `
    names {NAME}[] "Names";
    authors {SONG_AUTHOR}[] "Authors";
    link TEXTSHORT "Link";
    files {SONG_FILE}[] "Files";
    unofficialNames {UNOFFICIAL_NAME}[] "Unofficial Names";
    swfMusicNumbers INT[] "SWF Numbers";
    versions {VERSION}[] "Versions";
    composedDate {DATE_ESTIMATE} "Composed Date";
    externalReleaseDate DATE "External Release Date";
    priority INT "Priority";
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
  author: new NameDef(
    'Author', `
    name TEXTSHORT QUERY "Name";
  `),
  source: new NameDef(
    'Source', `
    name TEXTSHORT QUERY "Name";
  `),
  flash_room: new NameDef(
    'Club Penguin Room', `
    name TEXTSHORT QUERY "Name";
    open {TIME_RANGE} "Open";
    songUses {SONG_APPEARANCE}[] "Song Uses";
  `),
  flash_party: new NameDef(
    'Club Penguin Party', `
    name TEXTSHORT QUERY "Name";
    active {TIME_RANGE} "Active";
    partySongs {PARTY_SONG}[] "Songs";
  `),
  music_catalogue: new NameDef(
    'Music Catalogue', `
    name QUERY;
    description TEXT;
    launch DATE_ESTIMATE;
    songs CATALOGUE_ITEM[][];
  `),
  stage_play: new NameDef(
    'Stage Play', `
    name QUERY;
    song INT;
    appearances STAGE_APPEARANCE[];
  `),
  flash_minigame: new NameDef(
    'Club Penguin Minigame', `
    name QUERY;
    available TIME_RANGE;
    songs GAME_SONG[];
  `),
  flash_misc: new NameDef(
    'Miscelaneous Club Penguin', `
    isUnused BOOLEAN;
    name QUERY;
    description TEXT;
    available TIME_RANGE;
    song INT;
  `),
  penguin_chat_misc: new NameDef(
    'Miscelaneous Penguin Chat', `
    name QUERY;
    description TEXT;
    song INT;
    available TIME_RANGE;
  `),
  penguin_chat_three_room: new NameDef(
    'Penguin Chat 3 Room', `
    name QUERY "Name";
    open {TIME_RANGE} "Open";
  `),
  exclusive_app_appearance: new NameDef(
    'Miscelaneous Mobile App', `
    song INT;
    name QUERY;
    description TEXT;
    available TIME_RANGE;
  `),
  youtube_video: new NameDef(
    'Youtube Video', `
    name QUERY;
    publish_date DATE;
    appearances VIDEO_APPEARANCE[];
  `),
  tv_video: new NameDef(
    'TV Video', `
    name QUERY;
    earliest DATE_ESTIMATE;
    appearance VIDEO_APPEARANCE[];
  `),
  industry_release: new NameDef(
    'Industry Release', `
    release DATE;
    songs INT[];
  `),
  screenhog_comission: new NameDef(
    'Screenhog Comission', `
    comissioner TEXT;
    projectName TEXT;
    projectDescription TEXT;
    songs INT[];
    available DATE_ESTIMATE;
  `)
}, {
  NAME: new ClassDef(`
    name TEXTSHORT QUERY "Name";
    pt {LOCALIZATION_NAME} "Portuguese";
    fr {LOCALIZATION_NAME} "French";
    es {LOCALIZATION_NAME} "Spanish";
    de {LOCALIZATION_NAME} "German";
    ru {LOCALIZATION_NAME} "Russian";
  `),
  LOCALIZATION_NAME: new ClassDef(`
    name TEXTSHORT "Name";
    translationNotes TEXTLONG "Translation Notes";
  `, [
    new Validator(
      o => ((!o.reference && !o.translationNotes) || o.name),
      'Localization name contains reference or translation notes but contains no actual name'
    )
  ]),
  UNOFFICIAL_NAME: new ClassDef(`
    name TEXTSHORT QUERY "Name";
    description TEXTLONG "Description";
  `),
  SONG_AUTHOR: new ClassDef(`
    author ID(author) "Author";
  `),
  VERSION: new ClassDef(`
    name TEXTSHORT "Name";
    description TEXTLONG "Description";
  `),
  SONG_APPEARANCE: new ClassDef(`
    isUnused BOOLEAN "Is Unused?";
    available {TIME_RANGE} "Available";
    song ID(song) "Song";
  `),
  PARTY_SONG: new ClassDef(`
    isUnused BOOLEAN "Is unused?";
    type INT "Type";
    usePartyDate BOOLEAN "Use date from the party?";
    available {TIME_RANGE} "Available";
    song ID(song) "Song";
  `),
  CATALOGUE_ITEM: new ClassDef(`
    displayName TEXTSHORT "Display Name";
    song ID(song) "Song";
  `),
  STAGE_APPEARANCE: new ClassDef(`
    isUnused BOOLEAN "Is unused?";
    appearance {TIME_RANGE} "Appearance";
    song ID(song) "Song";
  `),
  GAME_SONG: new ClassDef(`
    isUnused BOOLEAN "Is unused";
    song ID(song) "Song";
    useMinigameDates BOOLEAN "Use Minigame Dates";
    available {TIME_RANGE} "Available";
  `),
  VIDEO_APPEARANCE: new ClassDef(`
    song ID(song) "Song";
    isEntireVideo BOOLEAN "Is Entire Video?";
    startTime INT "Start Time";
    endTime INT "End Time";
  `),
  DATE_ESTIMATE: new ClassDef(`
    date DATE "Date";
    isEstimate BOOLEAN "Is Estimate?";
  `),
  TIME_RANGE: new ClassDef(`
    start {DATE_ESTIMATE} "Start";
    end {DATE_ESTIMATE} "End";
  `),
  SONG_FILE: new ClassDef(`
    source ID(source) "Source"
    link TEXTSHORT "Link";
    isHQ BOOLEAN "Is HQ?";
    file FILE(audio) "File";
  `)
}, {
  epf_ost: new NameDef(
    'Elite Penguin Force OST', `
    songs ID(song)[];
  `),
  epfhr_ost: new NameDef(
    "Herbert's Revenge OST", `
    songs ID(song)[];
  `),
  game_day_ost: new NameDef(
    'Game Day OST', `
    songs ID(song)[];
  `)
}]

module.exports = def
