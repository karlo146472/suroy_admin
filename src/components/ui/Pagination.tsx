import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  /** 1-based current page. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** What the rows are called in the "Showing 1-10 of 18 ..." text. */
  noun?: string
}

/** First, last and the pages around the current one, with a gap marker where pages are skipped. */
function pageItems(page: number, count: number): (number | 'gap')[] {
  const wanted = [...new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count))].sort((a, b) => a - b)
  const items: (number | 'gap')[] = []
  wanted.forEach((p, i) => {
    if (i > 0 && p - wanted[i - 1] > 1) items.push('gap')
    items.push(p)
  })
  return items
}

export default function Pagination({ page, pageSize, total, onPageChange, noun = 'entries' }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1
  const end = Math.min(current * pageSize, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination__summary" aria-live="polite">
        Showing {start}–{end} of {total} {noun}
      </span>
      {pageCount > 1 && (
        <div className="pagination__controls">
          <button
            type="button"
            className="btn btn--small"
            onClick={() => onPageChange(current - 1)}
            disabled={current === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          {pageItems(current, pageCount).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="pagination__gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`btn btn--small pagination__page${item === current ? ' is-current' : ''}`}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === current ? 'page' : undefined}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="btn btn--small"
            onClick={() => onPageChange(current + 1)}
            disabled={current === pageCount}
            aria-label="Next page"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </nav>
  )
}
