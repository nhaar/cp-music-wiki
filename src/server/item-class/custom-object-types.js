const CustomObjectDef = require('./custom-object-def')
const ItemRuleValidator = require('./item-rule-validator')

/** Custom object types for the wiki */
module.exports = {
  NAME: new CustomObjectDef(`
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
  LOCALIZATION_NAME: new CustomObjectDef(`
    name TEXTSHORT
    'The official localized name for this language as used inside the game';
    translationNotes TEXTLONG
    'Explanations about how this name was translated';
  `, [
    new ItemRuleValidator(
      o => ((!o.reference && !o.translationNotes) || o.name),
      'Localization name contains reference or translation notes but contains no actual name'
    )
  ]),
  UNOFFICIAL_NAME: new CustomObjectDef(`
    name TEXTSHORT QUERY
    'The unofficial name';
    description TEXTLONG
    'A description for why this name is relevant';
  `),
  SONG_AUTHOR: new CustomObjectDef(`
    author ID(author)
    'The author';
  `),
  VERSION: new CustomObjectDef(`
    name TEXTSHORT
    'A given name for this version';
    description TEXTLONG
    'A description for this version, explaining what makes it different from the others,
    and other details such as where and why this version was created';
  `),
  SONG_APPEARANCE: new CustomObjectDef(`
    isUnused BOOLEAN "Is Unused?"
    'Whether the song is unused or not';
    available {TIME_RANGE}
    'The time period the song was available in-game';
    song ID(song)
    'The song used';
  `),
  PARTY_SONG: new CustomObjectDef(`
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
  CATALOGUE_ITEM: new CustomObjectDef(`
    displayName TEXTSHORT
    'How the song name was written in the catalogue';
    song ID(song)
    'The song';
  `),
  STAGE_APPEARANCE: new CustomObjectDef(`
    appearance {TIME_RANGE}
    'The time the play was available';
  `),
  GAME_SONG: new CustomObjectDef(`
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
  APP_SONG: new CustomObjectDef(`
    song ID(song);
    useMinigameDates BOOLEAN;
    available {TIME_RANGE};
  `),
  VIDEO_APPEARANCE: new CustomObjectDef(`
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
  DATE_ESTIMATE: new CustomObjectDef(`
    date DATE
    'The relevant date, be it the exact date or just an estimate';
    isEstimate BOOLEAN "Is Estimate?"
    'If the date used is just an estimate and not exact,
    this should be checked';
  `),
  TIME_RANGE: new CustomObjectDef(`
    start {DATE_ESTIMATE}
    'The first date in this time period';
    end {DATE_ESTIMATE}
    'The final date in this time period';
  `),
  SONG_FILE: new CustomObjectDef(`
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
  CATALOGUE_DATE: new CustomObjectDef(`
    date DATE QUERY
    'The date for the catalogue';
    isEstimate BOOLEAN "Is Estimate?"
    'Whether or not the date given is exact or an estimate';
  `),
  COMISSIONED_SONG: new CustomObjectDef(`
    song ID(song)
    'The song';
    use TEXTSHORT
    'A name to identify how this song was used in the project';
    description TEXTLONG
    'A description on how this song was used in the project';
    available {DATE_ESTIMATE}
    'The date this song was first available to the public';
  `),
  OST_SONG: new CustomObjectDef(`
    song ID(song);
    isUnused BOOLEAN;
    uses TEXTSHORT[];
  `),
  USED_SONG_USE: new CustomObjectDef(`
    available {TIME_RANGE}
    'The time period the song was available in-game';
    song ID(song)
    'The song used';
  `),
  QUEST_USE: new CustomObjectDef(`
    song ID(song);
    useDescription TEXTLONG;
    chapter INT;
    episode INT;
  `),
  CPI_PARTY_SONG: new CustomObjectDef(`
    song ID(song);
    description TEXTLONG;
  `),
  DS_SONG: new CustomObjectDef(`
    song ID(song);
    isUnused BOOLEAN;
    game SELECT(
      [epf "Elite Penguin Force"],
      [hr "Herbert's Revenge"]
    );
  `),
  MISC_SONG: new CustomObjectDef(`
    song ID(song);
    useOwnDate BOOLEAN;
    available {TIME_RANGE};
  `),
  MISC_SONG_UNUSED: new CustomObjectDef(`
    song ID(song);
    isUnused BOOLEAN;
    useOwnDate BOOLEAN;
    available {TIME_RANGE};
  `),
  CPI_AREA: new CustomObjectDef(`
    name TEXTSHORT;
    songUses {USED_SONG_USE}[];
  `),
  CPI_IGLOO_SONG: new CustomObjectDef(`
    displayName TEXTSHORT;
    song ID(song);
  `),
  DISAMBIGUATION_LINK: new CustomObjectDef(`
  pageName TEXTSHORT;
  pageExplanation TEXTLONG;
  `)
}
