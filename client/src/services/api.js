import { ACCESS_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT } from '../constants'

const API_BASE_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(message, { status, fields = [] } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

function notifyUnauthorized() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
}

async function request(path, options = {}) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  const responseText = await response.text()
  let payload = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      throw new ApiError('The server returned an invalid response.', {
        status: response.status,
      })
    }
  }

  if (response.status === 401) {
    notifyUnauthorized()
  }

  if (!response.ok) {
    const error = payload?.error
    throw new ApiError(
      error?.message ?? `The request failed with status ${response.status}.`,
      {
        status: response.status,
        fields: Array.isArray(error?.fields) ? error.fields : [],
      },
    )
  }

  return payload
}

export const api = Object.freeze({
  get(path) {
    return request(path)
  },
  post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
})
