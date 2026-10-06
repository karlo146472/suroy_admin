import { TriangleAlert, X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons shown in the bottom bar, e.g. Cancel / Save. */
  footer?: ReactNode
  /** Wider dialog for forms. */
  wide?: boolean
  /** Marks the dialog as being about a risky action: a warning icon and a coloured top edge. */
  tone?: 'danger' | 'caution'
}

/** Built on the native <dialog>, which handles focus trapping and the Escape key. */
export default function Modal({ open, title, onClose, children, footer, wide = false, tone }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // A form starts on its first field instead of the Close button. (Dialogs with no field keep the default.)
      dialog
        .querySelector<HTMLElement>(
          '.modal__body input:not([type="hidden"]):not([disabled]), .modal__body select:not([disabled]), .modal__body textarea:not([disabled])',
        )
        ?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal${wide ? ' modal--wide' : ''}${tone ? ` modal--${tone}` : ''}`}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is a backdrop click.
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="modal__header">
        <div className="modal__heading">
          {tone && <TriangleAlert className="modal__tone-icon" aria-hidden="true" />}
          <h2 id={titleId} className="modal__title">{title}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__footer">{footer}</div>}
    </dialog>
  )
}
