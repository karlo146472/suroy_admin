interface LoadingStateProps {
  label?: string
}

export default function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="state-box" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="state-box__text">{label}</span>
    </div>
  )
}
