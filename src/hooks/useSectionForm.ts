import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

type Errors<T> = Partial<Record<keyof T, string>>

/**
 * State for one self-contained form: values, errors shown after a field is left or on submit,
 * whether anything changed, and a submit handler that focuses the first invalid field.
 * `validate` should be a stable function (defined outside the component).
 */
export function useSectionForm<T extends Record<string, string>>(initial: T, validate: (values: T) => Errors<T>) {
  const [saved, setSaved] = useState(initial)
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const errors = useMemo(() => validate(values), [values, validate])
  const dirty = (Object.keys(values) as (keyof T)[]).some((key) => values[key] !== saved[key])

  const errorFor = (key: keyof T) => (submitted || touched[key] ? errors[key] : undefined)

  const fieldProps = (key: keyof T) => ({
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  })

  /** Back to the last saved values, or to `next` when given. */
  const reset = (next: T = saved) => {
    setSaved(next)
    setValues(next)
    setTouched({})
    setSubmitted(false)
  }

  const handleSubmit = (onValid: (values: T) => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      const formElement = e.currentTarget
      // Wait a frame so the error state (and aria-invalid) has rendered before focusing.
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    onValid(values)
  }

  return { values, dirty, errorFor, fieldProps, reset, handleSubmit }
}
