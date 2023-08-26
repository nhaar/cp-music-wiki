/**
 * Class to validate an assigned part of a class
 */
class Validator {
  /**
   * @param {function(ItemData) : boolean} f - Takes as argument an object that follows a class data's structure, and returns true if the object is following the rule assigned to this validator, else it returns false, indicating the data is not valid
   * @param {string} msg - Error message to display for the data if it is invalid
   */
  constructor (f, msg) {
    Object.assign(this, { f, msg })
  }
}

/** Class for a database class definition */
class ClassDef {
  /**
   * Assign both values to the object
   * @param {import("./database").CPT} code - The code snippet which contains the declaration for all properties within the class
   * @param {Validator[]} validators - A list of all data validators for the class
   */
  constructor (code, validators = []) {
    Object.assign(this, { code, validators })
  }
}

/** Class for a class definition that has a name (for main and static classes) */
class NameDef {
  /**
   * Assign both values to the object
   * @param {string} name - The "pretty name" for the class
   * @param {import("./database").CPT} code - The code snippet which contains the declaration for all properties within the class
   * @param {Validator[]} validators - A list of all data validators for the class
   */
  constructor (name, code, validators = []) {
    Object.assign(this, { name, code, validators })
  }
}

/** Array with the three `DefMap`s for main, helper and static classes */
const def = [{
  song: new NameDef(
    'Song', `
    names {NAME}[]
    'The official names of the song';
    authors {SONG_AUTHOR}[]
    'The authors that created the song';
    link TEXTSHORT
    'A YouTube link to the song';
    files {SONG_FILE}[]
    'Music files for the song';
    unofficialNames {UNOFFICIAL_NAME}[]
    'Unofficial but relevant names for the song';
    swfMusicNumbers INT[] "SWF Numbers"
    'The numbers for the SWF music files that used this song';
    versions {VERSION}[]
    'Description for different versions of the song. If there is only one version/variation of the song, this should be left empty';
    composedDate {DATE_ESTIMATE}
    'A known date for when the song was composed, be it when it was started, finished, or in-between';
    externalReleaseDate DATE
    'An external date if the song was first released outside of anything Club Penguin related';
    priority INT
    'A number that represents the priority of the song if there are multiple songs
    that were released in the same day as this one, and is used to resolve the conflict
    for the order in the lists. This can be left empty until necessary';
  `, [
      new Validator(
        o => o.names.length > 0 || o.unofficialNames.length > 0,
        'A song must have at least one name or one unofficial name'
      ),
      new Validator(
        o => o.link === null || o.link.includes('youtube.com/watch?v=') || o.link.includes('youtu.be/'),
        'A song link must be a valid YouTube link'
      )
    ]),
  author: new NameDef(
    'Author', `
    name TEXTSHORT QUERY
    'The author's real name';
  `),
  source: new NameDef(
    'Source', `
    name TEXTSHORT QUERY
    'Name of the source';
  `),
  flash_room: new NameDef(
    'Club Penguin Room', `
    name TEXTSHORT QUERY
    'The name of the room';
    open {TIME_RANGE}
    'The time period the room was visitable';
    songUses {SONG_APPEARANCE}[]
    'The times the room got a new song playing inside it';
  `),
  flash_party: new NameDef(
    'Club Penguin Party', `
    name TEXTSHORT QUERY
    'The name of the party';
    active {TIME_RANGE}
    'The period the party took place';
    partySongs {PARTY_SONG}[] "Songs"
    'The songs that played in the party';
  `),
  music_catalogue: new NameDef(
    'Music Catalogue', `
    description TEXTLONG
    'Special details about this catalogue, if any';
    launch {CATALOGUE_DATE}
    'The date the catalogue launched';
    songs {CATALOGUE_ITEM}[][]
    'The songs in the catalogue, organized in the same
    configuration they appear in-game';
  `),
  stage_play: new NameDef(
    'Stage Play', `
    name TEXTSHORT QUERY
    'The name of the stage play';
    appearances {TIME_RANGE}[]
    'The times the play debuted';
    themeSong ID(song)
    'The song song/associated';
  `),
  unused_stage: new NameDef(
    'Unused Stage Music', `
    stagePlay ID(stage_play);
    song ID(song);
    `
  ),
  flash_minigame: new NameDef(
    'Club Penguin Minigame', `
    name TEXTSHORT QUERY
    'The name of the minigame';
    available {TIME_RANGE}
    'The time period the minigame was playable';
    songs {GAME_SONG}[]
    'The songs that are related to the minigame';
  `),
  flash_misc: new NameDef(
    'Miscellaneous Club Penguin', `
    name TEXTSHORT QUERY
    'Name for the miscellaneous use';
    description TEXTLONG
    'Details for what this use is exactly';
    available {TIME_RANGE}
    'The time period this use was availabe';
    songs {MISC_SONG_UNUSED}[]
    'The songs used';
  `),
  penguin_chat_misc: new NameDef(
    'Miscelaneous Penguin Chat', `
    name TEXTSHORT QUERY
    'Name for the miscellaneous use';
    description TEXTLONG
    'Description for what this use is exactly';
    songs {MISC_SONG}[]
    'The songs used';
    available {TIME_RANGE}
    'The time period this use was avaiable';
  `),
  penguin_chat_three_misc: new NameDef(
    'Miscelaneous Penguin Chat 3', `
    name TEXTSHORT QUERY
    'Name for the miscellaneous use';
    description TEXTLONG
    'Description for what this use is exactly';
    songs {MISC_SONG}[]
    'The songs used';
    available {TIME_RANGE}
    'The time period this use was avaiable';
  `),
  penguin_chat_three_room: new NameDef(
    'Penguin Chat 3 Room', `
    name TEXTSHORT QUERY
    'Name of the room';
    open {TIME_RANGE}
    'Time period the room was open';
    songUses {SONG_APPEARANCE}[]
    'The times the room got a new song playing inside it';
  `),
  youtube_video: new NameDef(
    'Youtube Video', `
    name TEXTSHORT QUERY
    'Title for the YouTube video';
    publishDate DATE
    'The date the video was published';
    appearances {VIDEO_APPEARANCE}[]
    'The different times a song played in the video';
  `),
  tv_video: new NameDef(
    'TV Video', `
    name TEXTSHORT QUERY
    'A descriptive name for what the video is';
    earliest {DATE_ESTIMATE}
    'The earliest date the video aired';
    appearances {VIDEO_APPEARANCE}[]
    'The different times a song played in the video';
  `),
  industry_release: new NameDef(
    'Industry Release', `
    name TEXTSHORT QUERY
    'Name of the release';
    release DATE
    'The release date';
    songs ID(song)[]
    'The songs included in this release';
  `),
  cpi_screen: new NameDef(
    'Club Penguin Island Screen', `
    name TEXTSHORT QUERY;
    songUses {USED_SONG_USE}[];
  `),
  cpi_location: new NameDef(
    'Club Penguin Island Location', `
    name TEXTSHORT QUERY;
    areas {CPI_AREA}[];
  `),
  cpi_quest: new NameDef(
    'Club Penguin Island Quest', `
    character TEXTSHORT QUERY;
    releaseDate {DATE_ESTIMATE};
    questSongs {QUEST_USE}[];
    `
  ),
  cpi_party: new NameDef(
    'Club Penguin Island Party', `
    name TEXTSHORT QUERY;
    songs {CPI_PARTY_SONG}[];
    active {TIME_RANGE};
    `
  ),
  cpi_minigame: new NameDef(
    'Club Penguin Island Minigame', `
    name TEXTSHORT QUERY;
    releaseDate {DATE_ESTIMATE};
    song ID(song);
    `
  ),
  series_misc: new NameDef(
    'Miscellaneous', `
    name TEXTSHORT QUERY
    'Name for the miscellaneous use';
    description TEXTLONG
    'Description for what this use is exactly';
    songs {MISC_SONG}[]
    'The songs used';
    available {TIME_RANGE}
    'The time period this use was avaiable';
    `
  ),
  mobile_apps: new NameDef(
    'Mobile Apps', `
    name TEXTSHORT QUERY;
    available {TIME_RANGE};
    songUses {APP_SONG}[];
    `
  ),
  screenhog_comission: new NameDef(
    'Screenhog Comission', `
    comissioner TEXTSHORT
    'Name of the comissioner';
    projectName TEXTSHORT
    'Name of the project the song was used in';
    projectDescription TEXTLONG
    'Description of the project';
    songs {COMISSIONED_SONG}[]
    'The songs comissioned for this project';
  `),
  file: new NameDef(
    'File', `
    originalname TEXTSHORT QUERY;
    filename TEXTSHORT;
    `
  ),
  category: new NameDef(
    'Category', `
    name TEXTSHORT QUERY;
    `
  ),
  disambiguation: new NameDef(
    'Disambiguation', `
    name TEXTSHORT QUERY;
    explanation TEXTLONG;
    links {DISAMBIGUATION_LINK}[];
    `
  )
}, {
  NAME: new ClassDef(`
    name TEXTSHORT QUERY
    'The official name, which is any name
    used inside Club Penguin or directly mentioned by the Club Penguin staff or the authors';
    pt {LOCALIZATION_NAME} "Portuguese"
    'The Portuguese localization of the name, if any';
    fr {LOCALIZATION_NAME} "French"
    'The French localization of the name, if any';
    es {LOCALIZATION_NAME} "Spanish"
    'The Spanish localization of the name, if any';
    de {LOCALIZATION_NAME} "German"
    'The German localization of the name, if any';
    ru {LOCALIZATION_NAME} "Russian"
    'The Russian localization of the name, if any';
  `),
  LOCALIZATION_NAME: new ClassDef(`
    name TEXTSHORT
    'The official localized name for this language as used inside the game';
    translationNotes TEXTLONG
    'Explanations about how this name was translated';
  `, [
    new Validator(
      o => ((!o.reference && !o.translationNotes) || o.name),
      'Localization name contains reference or translation notes but contains no actual name'
    )
  ]),
  UNOFFICIAL_NAME: new ClassDef(`
    name TEXTSHORT QUERY
    'The unofficial name';
    description TEXTLONG
    'A description for why this name is relevant';
  `),
  SONG_AUTHOR: new ClassDef(`
    author ID(author)
    'The author';
  `),
  VERSION: new ClassDef(`
    name TEXTSHORT
    'A given name for this version';
    description TEXTLONG
    'A description for this version, explaining what makes it different from the others,
    and other details such as where and why this version was created';
  `),
  SONG_APPEARANCE: new ClassDef(`
    isUnused BOOLEAN "Is Unused?"
    'Whether the song is unused or not';
    available {TIME_RANGE}
    'The time period the song was available in-game';
    song ID(song)
    'The song used';
  `),
  PARTY_SONG: new ClassDef(`
    isUnused BOOLEAN "Is unused?"
    'Whether the song is unused or not';
    type SELECT(
      [room "Room"],
      [minigame "Minigame"],
      [misc "Miscellaneous"]
    )
    'The category that this song belongs to on how it was used in this party';
    usePartyDate BOOLEAN "Use date from the party?"
    'If the song was released at the same time as the party, this should be checked, but if it was added after the beginning, then it shouldn't be checked';
    available {TIME_RANGE}
    'Only if the option above is unchecked, the time period the song was availabe';
    song ID(song)
    'The song';
  `),
  CATALOGUE_ITEM: new ClassDef(`
    displayName TEXTSHORT
    'How the song name was written in the catalogue';
    song ID(song)
    'The song';
  `),
  STAGE_APPEARANCE: new ClassDef(`
    appearance {TIME_RANGE}
    'The time the play was available';
  `),
  GAME_SONG: new ClassDef(`
    isUnused BOOLEAN "Is Unused?"
    'Whether or not the song is unused';
    song ID(song)
    'The song';
    useMinigameDates BOOLEAN
    'If the song was used at the same time as the minigame released, this should be checked,
    otherwise, it should be unchecked';
    available {TIME_RANGE}
    'If the option above is unchecked and if this song is used, the time this was available';
  `),
  APP_SONG: new ClassDef(`
    song ID(song);
    useMinigameDates BOOLEAN;
    available {TIME_RANGE};
  `),
  VIDEO_APPEARANCE: new ClassDef(`
    song ID(song)
    'The song';
    isEntireVideo BOOLEAN "Is Entire Video?"
    'If the song takes up the entire video, this should be checked';
    startTime INT
    'If the song doesn't take the entire video, the timestamp in seconds that
    the song starts playing';
    endTime INT
    'If the song doesn't take the entire video, the timestamp in seconds that
    the song stops playing';
  `),
  DATE_ESTIMATE: new ClassDef(`
    date DATE
    'The relevant date, be it the exact date or just an estimate';
    isEstimate BOOLEAN "Is Estimate?"
    'If the date used is just an estimate and not exact,
    this should be checked';
  `),
  TIME_RANGE: new ClassDef(`
    start {DATE_ESTIMATE}
    'The first date in this time period';
    end {DATE_ESTIMATE}
    'The final date in this time period';
  `),
  SONG_FILE: new ClassDef(`
    source ID(source)
    'The source the file comes from';
    link TEXTSHORT
    'If this song has a specific link it can be found in,
    then it should be put here';
    isHQ BOOLEAN "Is HQ?"
    'If this file is part of the group of HQ files, this should be checked';
    file FILE(audio)
    'A preview of the file, if it can be played,
    or an upload section to submit the file';
  `),
  CATALOGUE_DATE: new ClassDef(`
    date DATE QUERY
    'The date for the catalogue';
    isEstimate BOOLEAN "Is Estimate?"
    'Whether or not the date given is exact or an estimate';
  `),
  COMISSIONED_SONG: new ClassDef(`
    song ID(song)
    'The song';
    use TEXTSHORT
    'A name to identify how this song was used in the project';
    description TEXTLONG
    'A description on how this song was used in the project';
    available {DATE_ESTIMATE}
    'The date this song was first available to the public';
  `),
  OST_SONG: new ClassDef(`
    song ID(song);
    isUnused BOOLEAN;
    uses TEXTSHORT[];
  `),
  USED_SONG_USE: new ClassDef(`
    available {TIME_RANGE}
    'The time period the song was available in-game';
    song ID(song)
    'The song used';
  `),
  QUEST_USE: new ClassDef(`
    song ID(song);
    useDescription TEXTLONG;
    chapter INT;
    episode INT;
  `),
  CPI_PARTY_SONG: new ClassDef(`
    song ID(song);
    description TEXTLONG;
  `),
  DS_SONG: new ClassDef(`
    song ID(song);
    isUnused BOOLEAN;
    game SELECT(
      [epf "Elite Penguin Force"],
      [hr "Herbert's Revenge"]
    );
  `),
  MISC_SONG: new ClassDef(`
    song ID(song);
    useOwnDate BOOLEAN;
    available {TIME_RANGE};
  `),
  MISC_SONG_UNUSED: new ClassDef(`
    song ID(song);
    isUnused BOOLEAN;
    useOwnDate BOOLEAN;
    available {TIME_RANGE};
  `),
  CPI_AREA: new ClassDef(`
    name TEXTSHORT;
    songUses {USED_SONG_USE}[];
  `),
  CPI_IGLOO_SONG: new ClassDef(`
    displayName TEXTSHORT;
    song ID(song);
  `),
  DISAMBIGUATION_LINK: new ClassDef(`
  pageName TEXTSHORT;
  pageExplanation TEXTLONG;
  `)
}, {
  ds_ost: new NameDef(
    'DS Games OST', `
    songs {DS_SONG}[]
    'The songs that belong to the OST';
  `),
  epfhr_ost: new NameDef(
    "Herbert's Revenge OST", `
    songs {OST_SONG}[]
    'The song that belong to the OST';
  `),
  game_day_ost: new NameDef(
    'Game Day OST', `
    songs {OST_SONG}[]
    'The songs that belong to the OST';
  `),
  cpi_igloo: new NameDef(
    'Club Penguin Island Igloo Music', `
    songs {CPI_IGLOO_SONG}[];
    `
  ),
  main_page: new NameDef(
    'Main Page', `
    text TEXTLONG;
    `
  )
}]

module.exports = def
