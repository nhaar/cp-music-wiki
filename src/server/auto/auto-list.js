/**
 * List of all JavaScript JSX main components to generate the page's JavaScript
 *
 * Every components that represents an entire page is put inside a file `path`.jsx inside `src/client/components`, and
 * their names must be listed here. Once listed, they can be used to automatically generate the base files that
 * access the component and render it on the screen with the given variables, and those files are then bundled,
 * so the files that will be generated from this don't need to ever be accessed.
*/
module.exports = [
  'MainPage',
  'Delete',
  'Diff',
  'Editor',
  'FileUpload',
  'PreEditor',
  'QueryInput',
  'ReadItem',
  'RecentChanges',
  'Undelete',
  'UserLogin',
  'Category',
  'CreateAccount',
  'ResetPassword',
  'RequestReset',
  'Block',
  'gens/OstGen',
  'gens/SongGen',
  'gens/DisambigGen'
]
