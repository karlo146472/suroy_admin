import { useId, type ReactNode } from 'react'

interface ControlProps {
  id: string
  'aria-invalid'?: true
  'aria-required'?: true
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  /** Spread the given props onto the input so the label and error message are linked to it. */
  children: (control: ControlProps) => ReactNode
}

export default function FormField({ label, required, error, hint, children }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({
        id,
        'aria-required': required ? true : undefined,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <span id={messageId} className={error ? 'form-field__error' : 'form-field__hint'}>
          {message}
        </span>
      )}
    </div>
  )
}
