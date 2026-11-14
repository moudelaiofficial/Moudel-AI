
import { supabase } from '../lib/supabase.js'

const ACTIVITY_SELECT = `
  id,
  user_id,
  paper_id,
  activity_type,
  search_query,
  metadata,
  created_at,
  paper:papers (
    id,
    title,
    authors,
    paper_url,
    publication_date
  )
`

function throwIfError(error) {
  if (error) throw error
}

// Record an activity for the currently authenticated user.
export async function logResearchActivity({
  activityType,
  paperId = null,
  searchQuery = null,
  metadata = {},
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfError(authError)

  if (!user) {
    throw new Error('You must be signed in to record research activity.')
  }

  const { data, error } = await supabase
    .from('research_activity')
    .insert({
      user_id: user.id,
      paper_id: paperId,
      activity_type: activityType,
      search_query: searchQuery,
      metadata,
    })
    .select()
    .single()

  throwIfError(error)

  return data
}

// Fetch the current user's recent activity.
export async function getRecentActivity() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfError(authError)

  if (!user) {
    throw new Error('You must be signed in to view research activity.')
  }

  const { data, error } = await supabase
    .from('research_activity')
    .select(ACTIVITY_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  throwIfError(error)

  return data ?? []
}

// Clear only the current user's research activity.
export async function clearResearchHistory() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfError(authError)

  if (!user) {
    throw new Error('You must be signed in to clear research activity.')
  }

  const { error } = await supabase
    .from('research_activity')
    .delete()
    .eq('user_id', user.id)

  throwIfError(error)
}
