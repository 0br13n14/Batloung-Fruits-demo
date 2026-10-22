import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FormField } from '../components/FormField'
import { LoadingMessage } from '../components/LoadingMessage'
import { useAuth } from '../context/useAuth'

function getFieldErrors(fields) {
  return Object.fromEntries(
    fields
      .filter((field) => (field.field ?? field.path) && (field.message ?? field.msg))
      .map((field) => [
        field.field ?? field.path,
        field.message ?? field.msg,
      ]),
  )
}

export function LoginPage() {
  const { user, isLoading, login, sessionError, retrySession } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return <LoadingMessage message="Checking your session..." />
  }
  if (user) {
    return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
    } catch (error) {
      setFieldErrors(getFieldErrors(error.fields ?? []))
      setFormError(
        error.fields?.length ? '' : error.message || 'Unable to sign in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section aria-labelledby="login-title" className="login-card">
        <div className="login-heading">
          <p className="eyebrow">Batloung Fruits</p>
          <h1 id="login-title">Sign in</h1>
          <p>Use your account to access the distribution system.</p>
        </div>
        {sessionError && (
          <div className="form-message form-message--error" role="alert">
            <p>{sessionError}</p>
            <button
              className="button button--secondary"
              onClick={() => void retrySession()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
        {formError && (
          <p className="form-message form-message--error" role="alert">
            {formError}
          </p>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <FormField
            error={fieldErrors.email}
            label="Email address"
            name="email"
            required
          >
            <input
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </FormField>
          <FormField
            error={fieldErrors.password}
            label="Password"
            name="password"
            required
          >
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </FormField>
          <button
            className="button button--primary login-submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
