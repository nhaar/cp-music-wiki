const ItemClassDef = require('./item-class-def')
const ItemRuleValidator = require('./item-rule-validator')

module.exports = {
  dynamic: {
    song: new ItemClassDef(
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
        new ItemRuleValidator(
          o => o.names.length > 0 || o.unofficialNames.length > 0,
          'A song must have at least one name or one unofficial name'
        ),
        new ItemRuleValidator(
          o => o.link === null || o.link.includes('youtube.com/watch?v=') || o.link.includes('youtu.be/'),
          'A song link must be a valid YouTube link'
        )
      ]),
    author: new ItemClassDef(
      'Author', `
      name TEXTSHORT QUERY
      'The author's real name';
    `),
    source: new ItemClassDef(
      'Source', `
      name TEXTSHORT QUERY
      'Name of the source';
    `),
    flash_room: new ItemClassDef(
      'Club Penguin Room', `
      name TEXTSHORT QUERY
      'The name of the room';
      open {TIME_RANGE}
      'The time period the room was visitable';
      songUses {SONG_APPEARANCE}[]
      'The times the room got a new song playing inside it';
    `),
    flash_party: new ItemClassDef(
      'Club Penguin Party', `
      name TEXTSHORT QUERY
      'The name of the party';
      active {TIME_RANGE}
      'The period the party took place';
      partySongs {PARTY_SONG}[] "Songs"
      'The songs that played in the party';
    `),
    music_catalogue: new ItemClassDef(
      'Music Catalogue', `
      description TEXTLONG
      'Special details about this catalogue, if any';
      launch {CATALOGUE_DATE}
      'The date the catalogue launched';
      songs {CATALOGUE_ITEM}[][]
      'The songs in the catalogue, organized in the same
      configuration they appear in-game';
    `),
    stage_play: new ItemClassDef(
      'Stage Play', `
      name TEXTSHORT QUERY
      'The name of the stage play';
      appearances {TIME_RANGE}[]
      'The times the play debuted';
      themeSong ID(song)
      'The song song/associated';
    `),
    unused_stage: new ItemClassDef(
      'Unused Stage Music', `
      stagePlay ID(stage_play);
      song ID(song);
      `
    ),
    flash_minigame: new ItemClassDef(
      'Club Penguin Minigame', `
      name TEXTSHORT QUERY
      'The name of the minigame';
      available {TIME_RANGE}
      'The time period the minigame was playable';
      songs {GAME_SONG}[]
      'The songs that are related to the minigame';
    `),
    flash_misc: new ItemClassDef(
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
    penguin_chat_misc: new ItemClassDef(
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
    penguin_chat_three_misc: new ItemClassDef(
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
    penguin_chat_three_room: new ItemClassDef(
      'Penguin Chat 3 Room', `
      name TEXTSHORT QUERY
      'Name of the room';
      open {TIME_RANGE}
      'Time period the room was open';
      songUses {SONG_APPEARANCE}[]
      'The times the room got a new song playing inside it';
    `),
    youtube_video: new ItemClassDef(
      'Youtube Video', `
      name TEXTSHORT QUERY
      'Title for the YouTube video';
      publishDate DATE
      'The date the video was published';
      appearances {VIDEO_APPEARANCE}[]
      'The different times a song played in the video';
    `),
    tv_video: new ItemClassDef(
      'TV Video', `
      name TEXTSHORT QUERY
      'A descriptive name for what the video is';
      earliest {DATE_ESTIMATE}
      'The earliest date the video aired';
      appearances {VIDEO_APPEARANCE}[]
      'The different times a song played in the video';
    `),
    industry_release: new ItemClassDef(
      'Industry Release', `
      name TEXTSHORT QUERY
      'Name of the release';
      release DATE
      'The release date';
      songs ID(song)[]
      'The songs included in this release';
    `),
    cpi_screen: new ItemClassDef(
      'Club Penguin Island Screen', `
      name TEXTSHORT QUERY;
      songUses {USED_SONG_USE}[];
    `),
    cpi_location: new ItemClassDef(
      'Club Penguin Island Location', `
      name TEXTSHORT QUERY;
      areas {CPI_AREA}[];
    `),
    cpi_quest: new ItemClassDef(
      'Club Penguin Island Quest', `
      character TEXTSHORT QUERY;
      releaseDate {DATE_ESTIMATE};
      questSongs {QUEST_USE}[];
      `
    ),
    cpi_party: new ItemClassDef(
      'Club Penguin Island Party', `
      name TEXTSHORT QUERY;
      songs {CPI_PARTY_SONG}[];
      active {TIME_RANGE};
      `
    ),
    cpi_minigame: new ItemClassDef(
      'Club Penguin Island Minigame', `
      name TEXTSHORT QUERY;
      releaseDate {DATE_ESTIMATE};
      song ID(song);
      `
    ),
    series_misc: new ItemClassDef(
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
    mobile_apps: new ItemClassDef(
      'Mobile Apps', `
      name TEXTSHORT QUERY;
      available {TIME_RANGE};
      songUses {APP_SONG}[];
      `
    ),
    screenhog_comission: new ItemClassDef(
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
    file: new ItemClassDef(
      'File', `
      originalname TEXTSHORT QUERY;
      filename TEXTSHORT;
      `
    ),
    category: new ItemClassDef(
      'Category', `
      name TEXTSHORT QUERY;
      `
    ),
    disambiguation: new ItemClassDef(
      'Disambiguation', `
      name TEXTSHORT QUERY;
      explanation TEXTLONG;
      links {DISAMBIGUATION_LINK}[];
      `
    )
  },
  static: {
    ds_ost: new ItemClassDef(
      'DS Games OST', `
      songs {DS_SONG}[]
      'The songs that belong to the OST';
    `),
    epfhr_ost: new ItemClassDef(
      "Herbert's Revenge OST", `
      songs {OST_SONG}[]
      'The song that belong to the OST';
    `),
    game_day_ost: new ItemClassDef(
      'Game Day OST', `
      songs {OST_SONG}[]
      'The songs that belong to the OST';
    `),
    cpi_igloo: new ItemClassDef(
      'Club Penguin Island Igloo Music', `
      songs {CPI_IGLOO_SONG}[];
      `
    ),
    main_page: new ItemClassDef(
      'Main Page', `
      text TEXTLONG;
      `
    )
  }
}
