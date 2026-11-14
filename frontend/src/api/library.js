
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
  if (error) {
    throw error
  }
}

function mapSavedPaper(item) {
  const paper = item.paper

  if (!paper) {
    return null
  }

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

// Fetch the authenticated user's saved papers
export async function getLibraryPapers() {
  const { data, error } = await supabase
    .from('saved_papers')
    .select(LIBRARY_SELECT)
    .order('saved_at', { ascending: false })

  throwIfError(error)

  return (data ?? [])
    .map(mapSavedPaper)
    .filter(Boolean)
}

// Update reading status
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

// Update personal notes
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

// Remove a paper from the user's library
export async function removeSavedPaper(id) {
  const { error } = await supabase
    .from('saved_papers')
    .delete()
    .eq('id', id)

  throwIfError(error)
}
