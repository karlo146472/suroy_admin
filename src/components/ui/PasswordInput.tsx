import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Names the field for the show/hide button, e.g. "current password". */
  toggleLabel: string
}

/** A password field with its own show/hide button. It hides itself again when it is unmounted. */
export default function PasswordInput({ toggleLabel, className, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="input-group">
      <input
        {...inputProps}
        className={className ?? 'input'}
        type={visible ? 'text' : 'password'}
        spellCheck={false}
        autoCapitalize="off"
      />
      <button
        type="button"
        className="btn btn--icon"
        onClick={() => setVisible((v) => !v)}
        aria-label={`${visible ? 'Hide' : 'Show'} ${toggleLabel}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
