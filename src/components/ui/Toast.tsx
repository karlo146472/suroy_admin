import { CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi } from './useToast'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const icons: Record<ToastKind, LucideIcon> = { success: CheckCircle2, error: XCircle, info: Info }
const MAX_VISIBLE = 3

/** Long messages stay a little longer; errors stay longest. */
const durationFor = (kind: ToastKind, message: string) =>
  Math.min(kind === 'error' ? 10_000 : 8_000, (kind === 'error' ? 6_000 : 4_000) + message.length * 40)

/**
 * Non-blocking messages for outcomes like "saved" or "deleted". They never take focus or block the page.
 * The container is a popover, which the browser puts in the top layer, so toasts stay visible above open dialogs.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const region = useRef<HTMLDivElement>(null)
  // Auto-dismiss timers, so they can be paused while someone is reading or using a toast.
  const timers = useRef(new Map<number, number>())
  const paused = useRef(false)
  const visible = useRef<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const schedule = useCallback(
    (toast: ToastItem) => {
      window.clearTimeout(timers.current.get(toast.id))
      timers.current.set(
        toast.id,
        window.setTimeout(() => dismiss(toast.id), durationFor(toast.kind, toast.message)),
      )
    },
    [dismiss],
  )

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const toast = { id: ++nextId.current, kind, message }
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), toast])
      // While paused, the new toast starts its countdown when the pause ends.
      if (!paused.current) schedule(toast)
    },
    [schedule],
  )

  // WCAG 2.2.1: a message must not disappear while someone is still reading it or reaching for its button.
  const pause = () => {
    paused.current = true
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }
  const resume = () => {
    paused.current = false
    visible.current.forEach(schedule)
  }

  useEffect(() => {
    visible.current = toasts
  }, [toasts])

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  )

  // Show the popover while there is something to display, hide it otherwise.
  useEffect(() => {
    const element = region.current
    if (!element?.showPopover) return
    const isOpen = element.matches(':popover-open')
    if (toasts.length > 0 && !isOpen) element.showPopover()
    if (toasts.length === 0 && isOpen) element.hidePopover()
  }, [toasts.length])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={region}
        popover="manual"
        className="toasts"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) resume()
        }}
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.kind]
          return (
            <div
              key={toast.id}
              className={`toast toast--${toast.kind}`}
              role={toast.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon size={20} className="toast__icon" aria-hidden="true" />
              <span className="toast__message">{toast.message}</span>
              <button type="button" className="icon-button toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
