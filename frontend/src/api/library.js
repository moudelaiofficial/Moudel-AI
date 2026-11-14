
import { supabase } from '../lib/supabase.js'

const LIBRARY_SELECT = `
  id,
  paper_id,
  is_read,
  notes,
  saved_at,
  paper:papers (
    id,
    title,
    authors,
    abstract,
    doi,
    arxiv_id,
    source,
    publication_date,
    categories,
    paper_url,
    pdf_url
  )
`

function throwIfError(error) {
  if (error) throw error
}

function mapSavedPaper(item) {
  const paper = item.paper

  if (!paper) return null

  return {
    id: item.id,
    paperId: item.paper_id,
    title: paper.title ?? 'Untitled paper',
    authors: Array.isArray(paper.authors)
      ? paper.authors.join(', ')
      : paper.authors ?? '',
    abstract: paper.abstract ?? '',
    doi: paper.doi ?? '',
    arxivId: paper.arxiv_id ?? '',
    source: paper.source ?? '',
    publicationDate: paper.publication_date,
    categories: paper.categories ?? [],
    paperUrl: paper.paper_url ?? '',
    pdfUrl: paper.pdf_url ?? '',
    read: item.is_read,
    notes: item.notes ?? '',
    savedAt: item.saved_at,
  }
}

// Fetch the authenticated user's saved papers.
export async function getLibraryPapers() {
  const { data, error } = await supabase
    .from('saved_papers')
    .select(LIBRARY_SELECT)
    .order('saved_at', { ascending: false })

  throwIfError(error)

  return (data ?? []).map(mapSavedPaper).filter(Boolean)
}

// Get OpenAlex IDs already saved by the authenticated user.
export async function getSavedOpenAlexIds() {
  const { data, error } = await supabase
    .from('saved_papers')
    .select(`
      paper:papers (
        metadata
      )
    `)

  throwIfError(error)

  return (data ?? [])
    .map((item) => item.paper?.metadata?.openalex_id)
    .filter(Boolean)
}

// Save a paper discovered through OpenAlex.
export async function savePaper(paper) {
  if (!paper?.id || !paper?.title) {
    throw new Error('Invalid research paper.')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfError(authError)

  if (!user) {
    throw new Error('You must be signed in to save a paper.')
  }

  // Look for an existing paper using its OpenAlex ID.
  const { data: existingPaper, error: lookupError } = await supabase
    .from('papers')
    .select('id')
    .contains('metadata', {
      openalex_id: paper.id,
    })
    .maybeSingle()

  throwIfError(lookupError)

  let paperId = existingPaper?.id

  // Create the paper record only if it does not exist.
  if (!paperId) {
    const { data: insertedPaper, error: insertError } = await supabase
      .from('papers')
      .insert({
        title: paper.title,
        authors: Array.isArray(paper.authors) ? paper.authors : [],
        abstract: paper.abstract ?? '',
        doi: paper.doi ?? null,
        arxiv_id: paper.arxiv_id ?? paper.arxivId ?? null,
        source: paper.source ?? null,
        publication_date: paper.publication_date ?? null,
        categories: [
          paper.primary_topic,
          paper.field,
        ].filter(Boolean),
        paper_url: paper.paper_url ?? null,
        pdf_url: paper.pdf_url ?? null,
        metadata: {
          openalex_id: paper.id,
          citation_count: paper.citation_count ?? 0,
          is_open_access: paper.is_open_access ?? false,
          type: paper.type ?? null,
          primary_topic: paper.primary_topic ?? null,
          field: paper.field ?? null,
        },
      })
      .select('id')
      .single()

    throwIfError(insertError)

    paperId = insertedPaper.id
  }

  // Check whether this user has already saved the paper.
  const { data: existingSave, error: saveLookupError } = await supabase
    .from('saved_papers')
    .select('id')
    .eq('user_id', user.id)
    .eq('paper_id', paperId)
    .maybeSingle()

  throwIfError(saveLookupError)

  if (existingSave) {
    return {
      paperId,
      alreadySaved: true,
    }
  }

  const { error: saveError } = await supabase
    .from('saved_papers')
    .insert({
      user_id: user.id,
      paper_id: paperId,
      is_read: false,
      notes: '',
    })

  throwIfError(saveError)

  // Record the save activity.
  // The paper save remains successful even if activity logging fails.
  try {
    const { error: activityError } = await supabase
      .from('research_activity')
      .insert({
        user_id: user.id,
        paper_id: paperId,
        activity_type: 'paper_saved',
        metadata: {
          openalex_id: paper.id,
          title: paper.title,
        },
      })

    if (activityError) {
      console.warn('Could not record save activity:', activityError)
    }
  } catch (activityError) {
    console.warn('Could not record save activity:', activityError)
  }

  return {
    paperId,
    alreadySaved: false,
  }
}

// Update reading status.
export async function updatePaperReadStatus({ id, isRead }) {
  const { data, error } = await supabase
    .from('saved_papers')
    .update({ is_read: isRead })
    .eq('id', id)
    .select(LIBRARY_SELECT)
    .single()

  throwIfError(error)

  return mapSavedPaper(data)
}

// Update personal notes.
export async function updatePaperNotes({ id, notes }) {
  const { data, error } = await supabase
    .from('saved_papers')
    .update({ notes: notes.trim() })
    .eq('id', id)
    .select(LIBRARY_SELECT)
    .single()

  throwIfError(error)

  return mapSavedPaper(data)
}

// Remove a paper from the user's library.
export async function removeSavedPaper(id) {
  const { error } = await supabase
    .from('saved_papers')
    .delete()
    .eq('id', id)

  throwIfError(error)
}
