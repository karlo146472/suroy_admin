import type { ReactNode } from 'react'

/** Row that holds a SearchBar and FilterSelects above a table. */
export default function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>
}
