import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'

type ConfirmTone = 'neutral' | 'caution' | 'danger'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  /** Shorthand for tone="danger": a permanent delete or similar. */
  destructive?: boolean
  /**
   * How risky the action is. "danger" (red) is for permanent deletes, "caution" (amber) for reversible but
   * impactful changes such as archiving or suspending, "neutral" for everything else.
   */
  tone?: ConfirmTone
  busy?: boolean
  /** When set, the confirm button stays disabled until the user types this text. */
  requireText?: string
  onConfirm: () => void
  onCancel: () => void
}

const confirmButtonClass: Record<ConfirmTone, string> = {
  neutral: 'btn--primary',
  caution: 'btn--warning',
  danger: 'btn--danger',
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  tone,
  busy = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const effectiveTone: ConfirmTone = tone ?? (destructive ? 'danger' : 'neutral')
  const risky = effectiveTone !== 'neutral'

  const matches = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase()
  const canConfirm = matches && !busy

  // Runs after the Modal has opened. A typed confirmation takes focus so typing can start straight away;
  // otherwise a risky action focuses Cancel, so pressing Enter by accident never confirms it.
  useEffect(() => {
    if (!open) return
    if (requireText) inputRef.current?.focus()
    else if (risky) cancelRef.current?.focus()
  }, [open, requireText, risky])

  // Whichever way the dialog closes, the next time it opens the field starts empty.
  const cancel = () => {
    setTyped('')
    onCancel()
  }
  const confirm = () => {
    if (!canConfirm) return
    setTyped('')
    onConfirm()
  }

  return (
    <Modal
      open={open}
      title={title}
      tone={risky ? (effectiveTone as 'danger' | 'caution') : undefined}
      onClose={cancel}
      footer={
        <>
          <button ref={cancelRef} type="button" className="btn" onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${confirmButtonClass[effectiveTone]}`}
            onClick={confirm}
            disabled={!canConfirm}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
      {requireText && (
        <label className="confirm-field">
          <span>
            To confirm, type <strong>{requireText}</strong>
          </span>
          <input
            ref={inputRef}
            className="input"
            type="text"
            value={typed}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirm()
              }
            }}
          />
        </label>
      )}
    </Modal>
  )
}
