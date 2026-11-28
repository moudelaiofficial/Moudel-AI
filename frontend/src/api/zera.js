import { apiRequest } from '../lib/api.js'

export async function sendZeraMessage(message, { signal } = {}) {
  return apiRequest('/zera/chat', {
    method: 'POST',
    body: {
      message,
    },
    signal,
  })
}