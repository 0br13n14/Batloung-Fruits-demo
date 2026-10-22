export function LoadingMessage({ message = 'Loading...' }) {
  return (
    <div className="loading-message" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
