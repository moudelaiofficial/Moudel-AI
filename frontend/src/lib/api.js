
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiRequest(
  path,
  { method = 'GET', body, headers = {}, signal } = {},
) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const requestHeaders = new Headers(headers)

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    signal,
    ...(body !== undefined
      ? {
          body: body instanceof FormData ? body : JSON.stringify(body),
        }
      : {}),
  })

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError('Request failed.', response.status)
    }

    return null
  }

  const contentType = response.headers.get('content-type') || ''
  let data = null

  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    const text = await response.text()
    data = text || null
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String(data.detail)
        : `Request failed with status ${response.status}.`

    throw new ApiError(message, response.status, data)
  }

  return data
}