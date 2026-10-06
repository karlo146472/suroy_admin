import { useEffect } from 'react'

/** Sets the browser tab title, which is also what screen readers announce for a page. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
