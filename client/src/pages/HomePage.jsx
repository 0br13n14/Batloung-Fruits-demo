import { useAuth } from '../context/useAuth'

export function HomePage() {
  const { user } = useAuth()

  return (
    <section aria-labelledby="welcome-title" className="welcome-card">
      <p className="eyebrow">Workspace</p>
      <h2 id="welcome-title">Welcome, {user.fullName}</h2>
      <p>
        Your {user.role} workspace is ready. Use the side panel to access the
        tools available to your role.
      </p>
    </section>
  )
}
