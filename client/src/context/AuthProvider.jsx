import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ACCESS_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT } from '../constants'
import { api } from '../services/api'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(
    () => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)),
  )
  const [sessionError, setSessionError] = useState('')

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    setUser(null)
    setSessionError('')
  }, [])

  const loadCurrentUser = useCallback(async () => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
      setIsLoading(false)
      return
    }

    try {
      const result = await api.get('/auth/me')
      setUser(result.user)
      setSessionError('')
    } catch (error) {
      if (error.status !== 401) {
        setSessionError('Unable to verify your session. Sign in to continue.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const retrySession = useCallback(() => {
    setIsLoading(true)
    setSessionError('')
    return loadCurrentUser()
  }, [loadCurrentUser])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setIsLoading(false)
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
      void Promise.resolve().then(loadCurrentUser)
    }

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [loadCurrentUser])

  const login = useCallback(async (email, password) => {
    const result = await api.post('/auth/login', { email, password })
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken)
    setUser(result.user)
    setSessionError('')
    return result.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      sessionError,
      login,
      logout,
      retrySession,
    }),
    [user, isLoading, sessionError, login, logout, retrySession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
