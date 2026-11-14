
import { supabase } from '../lib/supabase.js'

const RECENT_PAPERS_SELECT = `
  id,
  paper_id,
  saved_at,
  paper:papers (
    id,
    title,
    authors,
    source,
    publication_date,
    paper_url,
    pdf_url
  )
`

const RECENT_COLLECTIONS_SELECT = `
  id,
  name,
  description,
  created_at,
  collection_papers(count)
`

function throwIfError(error) {
  if (error) throw error
}

function mapRecentPaper(item) {
  const paper = item.paper

  if (!paper) return null

  return {
    id: item.id,
    paperId: item.paper_id,
    title: paper.title ?? 'Untitled paper',
    authors: Array.isArray(paper.authors)
      ? paper.authors.join(', ')
      : paper.authors ?? '',
    source: paper.source ?? '',
    publicationDate: paper.publication_date,
    paperUrl: paper.paper_url ?? '',
    pdfUrl: paper.pdf_url ?? '',
    savedAt: item.saved_at,
  }
}

function mapRecentCollection(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    createdAt: item.created_at,
    paperCount: item.collection_papers?.[0]?.count ?? 0,
  }
}

async function getCount(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  throwIfError(error)

  return count ?? 0
}

export async function getOverviewData() {
  const [
    savedPapersCount,
    collectionsCount,
    activityCount,
    recentPapersResult,
    recentCollectionsResult,
  ] = await Promise.all([
    getCount('saved_papers'),
    getCount('collections'),
    getCount('research_activity'),

    supabase
      .from('saved_papers')
      .select(RECENT_PAPERS_SELECT)
      .order('saved_at', { ascending: false })
      .limit(5),

    supabase
      .from('collections')
      .select(RECENT_COLLECTIONS_SELECT)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  throwIfError(recentPapersResult.error)
  throwIfError(recentCollectionsResult.error)

  return {
    stats: {
      savedPapers: savedPapersCount,
      collections: collectionsCount,
      researchActivity: activityCount,
    },

    recentPapers: (recentPapersResult.data ?? [])
      .map(mapRecentPaper)
      .filter(Boolean),

    recentCollections: (recentCollectionsResult.data ?? [])
      .map(mapRecentCollection),
  }
}
