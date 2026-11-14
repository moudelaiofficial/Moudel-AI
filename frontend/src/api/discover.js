
import { apiRequest } from '../lib/api.js'

export async function searchResearchPapers({
  query,
  page = 1,
  limit = 10,
  category,
  year,
  sort = 'relevance',
  signal,
}) {
  const params = new URLSearchParams()

  // Add search query only when the user enters one.
  if (query?.trim()) {
    params.set('q', query.trim())
  }

  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', sort)

  if (category) {
    params.set('category', category)
  }

  if (year) {
    params.set('year', String(year))
  }

  return apiRequest(`/search/papers?${params.toString()}`, {
    signal,
  })
}
