import { createContext, useContext } from 'react'

export interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Shows a short, non-blocking message. Use it for outcomes ("saved", "deleted"), not for questions. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
