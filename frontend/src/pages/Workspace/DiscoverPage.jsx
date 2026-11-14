
import { useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  Search,
  SlidersHorizontal,
  Sparkles,
  Quote,
  RefreshCw,
} from 'lucide-react'

import { searchResearchPapers } from '../../api/discover.js'
import {
  savePaper,
  getSavedOpenAlexIds,
} from '../../api/library.js'

const categories = [
  'All research',
  'Computer Science',
  'Artificial Intelligence',
  'Medicine',
  'Engineering',
  'Physics',
]

const sortOptions = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
]

const categoryValues = {
  'All research': '',
  'Computer Science': 'computer-science',
  'Artificial Intelligence': 'artificial-intelligence',
  Medicine: 'medicine',
  Engineering: 'engineering',
  Physics: 'physics',
}

function formatDate(date) {
  if (!date) return 'Date unavailable'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable'
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return 'Author information unavailable'
  }

  if (authors.length <= 3) {
    return authors.join(', ')
  }

  return `${authors.slice(0, 3).join(', ')} and ${authors.length - 3} others`
}

function PaperCard({
  paper,
  isSaved,
  onSave,
  isSaving,
}) {
  return (
    <article className="border-b border-[#d9d2bf] py-7 first:pt-7">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8573]">
        {paper.source && (
          <span className="text-[#7153c9]">
            {paper.source}
          </span>
        )}

        {paper.publication_date && (
          <>
            <span>·</span>
            <span>{formatDate(paper.publication_date)}</span>
          </>
        )}

        {paper.type && (
          <>
            <span>·</span>
            <span>{paper.type.replaceAll('-', ' ')}</span>
          </>
        )}
      </div>

      <h3 className="mt-3 font-serif text-xl leading-snug text-[#1c1b19] sm:text-2xl">
        {paper.title}
      </h3>

      <p className="mt-2 text-xs leading-6 text-[#8a8573]">
        {formatAuthors(paper.authors)}
      </p>

      {paper.abstract ? (
        <p className="mt-4 line-clamp-4 text-sm leading-7 text-[#716b61]">
          {paper.abstract}
        </p>
      ) : (
        <p className="mt-4 text-sm italic text-[#a39b8e]">
          Abstract is not available for this paper.
        </p>
      )}

      {(paper.primary_topic || paper.field) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {paper.primary_topic && (
            <span className="rounded-full bg-[#ece7f8] px-3 py-1.5 text-[10px] text-[#5037a5]">
              {paper.primary_topic}
            </span>
          )}

          {paper.field && (
            <span className="rounded-full bg-[#ece7db] px-3 py-1.5 text-[10px] text-[#716b61]">
              {paper.field}
            </span>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#8a8573]">
          <span className="flex items-center gap-1.5">
            <Quote size={13} />
            {Number(paper.citation_count ?? 0).toLocaleString()} citations
          </span>

          {paper.is_open_access && (
            <span className="text-emerald-700">
              Open access
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onSave(paper)}
            disabled={isSaved || isSaving}
            className={`flex items-center gap-1.5 border px-3 py-2 text-xs transition ${
              isSaved
                ? 'border-[#d9d2bf] bg-[#ece7db] text-[#716b61]'
                : 'border-[#7153c9] text-[#7153c9] hover:bg-[#ece7f8]'
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            <Bookmark
              size={13}
              fill={isSaved ? 'currentColor' : 'none'}
            />

            {isSaved
              ? 'Saved'
              : isSaving
                ? 'Saving...'
                : 'Save to Library'}
          </button>

          {paper.paper_url && (
            <a
              href={paper.paper_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#7153c9] transition hover:text-[#5037a5]"
            >
              View paper
              <ExternalLink size={13} />
            </a>
          )}

          {paper.pdf_url && (
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#1c1b19] px-3 py-2 text-xs text-white transition hover:bg-[#45377b]"
            >
              <FileText size={13} />
              PDF
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function DiscoverPage() {
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All research')
  const [sortBy, setSortBy] = useState('relevance')
  const [year, setYear] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch saved OpenAlex IDs for the current user.
  const {
    data: savedOpenAlexIds = [],
  } = useQuery({
    queryKey: ['saved-openalex-ids'],
    queryFn: getSavedOpenAlexIds,
    staleTime: 30 * 1000,
  })

  // Save a paper and refresh dependent data.
  const saveMutation = useMutation({
    mutationFn: savePaper,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['saved-openalex-ids'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['library'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['library-papers'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['overview'],
        }),
      ])
    },
  })

  // Search mode or discipline browsing mode.
  const hasActiveDiscovery =
    Boolean(submittedQuery) ||
    activeCategory !== 'All research'

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'discover-papers',
      submittedQuery,
      activeCategory,
      year,
      sortBy,
      page,
    ],

    queryFn: ({ signal }) =>
      searchResearchPapers({
        query: submittedQuery,
        page,
        limit: 10,
        category: categoryValues[activeCategory],
        year: year ? Number(year) : undefined,
        sort: sortBy,
        signal,
      }),

    enabled: hasActiveDiscovery,
    staleTime: 60 * 1000,
    retry: 1,
  })

  const results = data?.results ?? []
  const totalCount = data?.total_count ?? 0
  const totalPages = Math.ceil(totalCount / 10)

  function handleSearch(event) {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) return

    setPage(1)
    setSubmittedQuery(trimmedQuery)
  }

  function handleCategoryChange(category) {
    setActiveCategory(category)
    setQuery('')
    setSubmittedQuery('')
    setPage(1)
  }

  function handleYearChange(event) {
    setYear(event.target.value)
    setPage(1)
  }

  function handleSortChange(event) {
    setSortBy(event.target.value)
    setPage(1)
  }

  function exploreTopic(topic, category = activeCategory) {
    setQuery(topic)
    setActiveCategory(category)
    setPage(1)
    setSubmittedQuery(topic)
  }

  function clearFilters() {
    setQuery('')
    setSubmittedQuery('')
    setActiveCategory('All research')
    setYear('')
    setSortBy('relevance')
    setPage(1)
  }

  function handleSavePaper(paper) {
    saveMutation.mutate(paper)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">

      {/* PAGE INTRO */}
      <section>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
          <Compass size={13} className="text-[#7153c9]" />
          Research discovery
        </div>

        <h1 className="mt-5 font-serif text-4xl tracking-tight sm:text-5xl">
          Discover something
          <span className="text-[#7153c9]"> meaningful.</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-7 text-[#716b61]">
          Explore academic research, follow ideas, and find the work
          that moves your questions forward.
        </p>
      </section>

      {/* SEARCH */}
      <section className="mt-10">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-3 border border-[#d9d2bf] bg-[#fffdf8] px-4 py-4 shadow-[0_3px_12px_rgba(28,27,25,0.025)] sm:px-5"
        >
          <Search size={19} className="shrink-0 text-[#8a8573]" />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search papers, topics, authors, or research questions..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa296]"
          />

          <button
            type="submit"
            disabled={!query.trim() || isFetching}
            className="flex shrink-0 items-center gap-2 bg-[#1c1b19] px-4 py-2.5 text-xs text-white transition hover:bg-[#45377b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isFetching ? 'Searching...' : 'Search'}
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#8a8573]">
          <Sparkles size={13} className="text-[#7153c9]" />
          <span>Try exploring:</span>

          {['Large language models', 'Computer vision', 'RAG systems'].map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => exploreTopic(topic)}
              className="text-[#7153c9] underline-offset-4 hover:underline"
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      {/* CATEGORY FILTERS */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
            Browse by discipline
          </p>

          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`flex items-center gap-2 border px-3 py-2 text-xs transition ${
              showFilters
                ? 'border-[#8b78c8] bg-[#ece7f8] text-[#5037a5]'
                : 'border-[#d9d2bf] text-[#716b61] hover:bg-[#ebe5d4]'
            }`}
          >
            <SlidersHorizontal size={14} />
            More filters
          </button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryChange(category)}
              aria-pressed={activeCategory === category}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-xs transition ${
                activeCategory === category
                  ? 'border-[#1c1b19] bg-[#1c1b19] text-white'
                  : 'border-[#d9d2bf] text-[#716b61] hover:bg-[#ebe5d4]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-4 border border-[#d9d2bf] bg-[#fffdf8] p-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="publication-year"
                className="text-xs font-medium text-[#716b61]"
              >
                Publication year
              </label>

              <select
                id="publication-year"
                value={year}
                onChange={handleYearChange}
                className="mt-2 w-full border border-[#d9d2bf] bg-transparent px-3 py-2.5 text-sm outline-none"
              >
                <option value="">Any year</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sort-order"
                className="text-xs font-medium text-[#716b61]"
              >
                Sort results
              </label>

              <select
                id="sort-order"
                value={sortBy}
                onChange={handleSortChange}
                className="mt-2 w-full border border-[#d9d2bf] bg-transparent px-3 py-2.5 text-sm outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* RESULTS */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d9d2bf] pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
              Research catalogue
            </p>

            <h2 className="mt-2 font-serif text-2xl">
              Research papers
            </h2>

            {hasActiveDiscovery && !isError && (
              <p className="mt-2 text-xs text-[#8a8573]">
                {totalCount.toLocaleString()} papers
                {submittedQuery ? ` matching "${submittedQuery}"` : ''}
                {activeCategory !== 'All research'
                  ? ` in ${activeCategory}`
                  : ''}
              </p>
            )}
          </div>

          {hasActiveDiscovery && (
            <div className="flex items-center gap-2 text-xs text-[#8a8573]">
              <ArrowDownUp size={14} />
              {sortOptions.find((option) => option.value === sortBy)?.label}
            </div>
          )}
        </div>

        {/* SAVE ERROR */}
        {saveMutation.isError && (
          <div className="mt-4 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            Could not save paper: {saveMutation.error?.message}
          </div>
        )}

        {/* INITIAL STATE */}
        {!hasActiveDiscovery && (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ece7db]">
              <BookOpen size={24} className="text-[#8a8573]" />
            </div>

            <h3 className="mt-5 font-serif text-2xl">
              Your next discovery awaits.
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8a8573]">
              Search for a topic, explore a discipline, or follow a
              research question to find relevant academic papers.
            </p>

            <button
              type="button"
              onClick={() => handleCategoryChange('Artificial Intelligence')}
              className="mt-6 bg-[#1c1b19] px-4 py-2.5 text-xs text-white transition hover:bg-[#45377b]"
            >
              Explore AI research
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {hasActiveDiscovery && isPending && (
          <div className="py-20 text-center">
            <RefreshCw size={25} className="mx-auto animate-spin text-[#7153c9]" />

            <p className="mt-4 text-sm text-[#8a8573]">
              Searching academic research...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {hasActiveDiscovery && isError && (
          <div className="py-16 text-center">
            <h3 className="font-serif text-2xl">
              We couldn't retrieve your results.
            </h3>

            <p className="mt-3 text-sm text-[#8a8573]">
              {error?.message || 'Something went wrong while searching.'}
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 inline-flex items-center gap-2 bg-[#1c1b19] px-4 py-2.5 text-xs text-white hover:bg-[#45377b]"
            >
              <RefreshCw size={13} />
              Try again
            </button>
          </div>
        )}

        {/* RESULTS LIST */}
        {hasActiveDiscovery &&
          !isPending &&
          !isError &&
          results.length > 0 && (
            <>
              {isFetching && (
                <p className="mt-3 text-xs text-[#8a8573]">
                  Updating results...
                </p>
              )}

              <div>
                {results.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    isSaved={savedOpenAlexIds.includes(paper.id)}
                    onSave={handleSavePaper}
                    isSaving={
                      saveMutation.isPending &&
                      saveMutation.variables?.id === paper.id
                    }
                  />
                ))}
              </div>

              {/* PAGINATION */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-[#8a8573]">
                  Page {page} of {Math.max(totalPages, 1)}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((current) => current - 1)}
                    className="flex items-center gap-2 border border-[#d9d2bf] px-3 py-2 text-xs text-[#716b61] hover:bg-[#ebe5d4] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft size={13} />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((current) => current + 1)}
                    className="flex items-center gap-2 bg-[#1c1b19] px-3 py-2 text-xs text-white hover:bg-[#45377b] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </>
          )}

        {/* EMPTY RESULTS */}
        {hasActiveDiscovery &&
          !isPending &&
          !isError &&
          results.length === 0 && (
            <div className="py-20 text-center">
              <BookOpen size={26} className="mx-auto text-[#8a8573]" />

              <h3 className="mt-5 font-serif text-2xl">
                No papers found.
              </h3>

              <p className="mt-3 text-sm text-[#8a8573]">
                Try a different search term or broaden your filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 border border-[#d9d2bf] px-4 py-2.5 text-xs text-[#716b61] hover:bg-[#ebe5d4]"
              >
                Clear filters
              </button>
            </div>
          )}
      </section>

      {/* NOTE */}
      <div className="mt-8 flex items-start gap-3 border-t border-[#d9d2bf] pt-5 text-xs leading-6 text-[#8a8573]">
        <Bookmark size={15} className="mt-0.5 shrink-0 text-[#7153c9]" />

        <p>
          Save interesting papers to your library and organize them into
          collections as you build your research knowledge base.
        </p>
      </div>
    </div>
  )
}
