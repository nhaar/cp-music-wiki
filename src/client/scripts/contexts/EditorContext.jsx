import { createContext } from 'react'

/** Context used to know if the current page is the read page (`false`) or the editor page (`true`) */
export const EditorContext = createContext(false)
