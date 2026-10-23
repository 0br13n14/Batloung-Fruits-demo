import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

export function buildQuery(params) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      searchParams.set(key, String(value))
    }
  })
  return searchParams.toString()
}

export function useApiList(path, collection, query = '') {
  const [revision, setRevision] = useState(0)
  const requestKey = `${query}\u001f${revision}`
  const [result, setResult] = useState({
    requestKey: '',
    rows: [],
    error: '',
  })

  const refresh = useCallback(() => setRevision((current) => current + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    api
      .get(`${path}${query ? `?${query}` : ''}`, { signal: controller.signal })
      .then((response) =>
        setResult({
          requestKey,
          rows: response[collection],
          error: '',
        }),
      )
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setResult({
            requestKey,
            rows: [],
            error: requestError.message,
          })
        }
      })

    return () => controller.abort()
  }, [collection, path, query, requestKey])

  return {
    rows: result.requestKey === requestKey ? result.rows : [],
    isLoading: result.requestKey !== requestKey,
    error: result.requestKey === requestKey ? result.error : '',
    refresh,
  }
}

export function getServerFieldErrors(error) {
  return Object.fromEntries(
    (error.fields ?? []).map(({ field, message }) => [field, message]),
  )
}
