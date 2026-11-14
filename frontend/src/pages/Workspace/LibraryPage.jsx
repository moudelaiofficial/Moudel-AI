
import { useMemo, useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  ArrowDownUp,
  BookOpen,
  Bookmark,
  FileText,
  FolderOpen,
  Search,
  Check,
  Trash2,
} from 'lucide-react'

import {
  getLibraryPapers,
  updatePaperReadStatus,
  removeSavedPaper,
} from '../../api/library.js'

const tabs = ['All papers', 'Unread', 'Read']

export default function LibraryPage() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('All papers')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Recently added')
  const [actionError, setActionError] = useState('')

  // Fetch saved papers
  const {
    data: papers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['library'],
    queryFn: getLibraryPapers,
  })

  // Update read/unread status
  const readMutation = useMutation({
    mutationFn: updatePaperReadStatus,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] })
      setActionError('')
    },

    onError: (err) => {
      setActionError(err.message || 'Unable to update reading status.')
    },
  })

  // Remove saved paper
  const removeMutation = useMutation({
    mutationFn: removeSavedPaper,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] })
      setActionError('')
    },

    onError: (err) => {
      setActionError(err.message || 'Unable to remove this paper.')
    },
  })

  // Summary counts
  const totalPapers = papers.length
  const readCount = papers.filter((paper) => paper.read).length
  const unreadCount = totalPapers - readCount

  // Search, filter and sort
  const filteredPapers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    const result = papers.filter((paper) => {
      const matchesSearch =
        paper.title.toLowerCase().includes(query) ||
        paper.authors.toLowerCase().includes(query)

      const matchesTab =
        activeTab === 'All papers' ||
        (activeTab === 'Read' && paper.read) ||
        (activeTab === 'Unread' && !paper.read)

      return matchesSearch && matchesTab
    })

    return [...result].sort((a, b) => {
      if (sortBy === 'Oldest added') {
        return new Date(a.savedAt) - new Date(b.savedAt)
      }

      if (sortBy === 'Title A–Z') {
        return a.title.localeCompare(b.title)
      }

      return new Date(b.savedAt) - new Date(a.savedAt)
    })
  }, [papers, searchQuery, activeTab, sortBy])

  function handleReadToggle(paper) {
    setActionError('')

    readMutation.mutate({
      id: paper.id,
      isRead: !paper.read,
    })
  }

  function handleRemovePaper(paper) {
    const confirmed = window.confirm(
      `Remove "${paper.title}" from your library?`
    )

    if (!confirmed) return

    setActionError('')
    removeMutation.mutate(paper.id)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">

      {/* INTRO */}
      <section>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
          <Bookmark size={13} className="text-[#7153c9]" />
          Personal research library
        </div>

        <h1 className="mt-5 font-serif text-4xl tracking-tight sm:text-5xl">
          Your research,
          <span className="text-[#7153c9]"> all together.</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-7 text-[#716b61]">
          Every paper you save, ready to revisit, read, and build upon.
          Your personal collection of knowledge starts here.
        </p>
      </section>

      {/* SUMMARY */}
      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total papers', value: totalPapers, icon: BookOpen },
          { label: 'Read', value: readCount, icon: FileText },
          { label: 'Unread', value: unreadCount, icon: Bookmark },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="border border-[#d9d2bf] bg-[#fffdf8] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#716b61]">{label}</span>
              <Icon size={17} className="text-[#7153c9]" />
            </div>

            <p className="mt-5 font-serif text-3xl">{value}</p>
          </div>
        ))}
      </section>

      {/* LIBRARY CONTROLS */}
      <section className="mt-14">
        <div className="flex flex-col justify-between gap-5 border-b border-[#d9d2bf] pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
              Your collection
            </p>
            <h2 className="mt-2 font-serif text-2xl">Saved papers</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-[#d9d2bf] bg-[#fffdf8] px-3 py-2.5">
              <Search size={15} className="text-[#8a8573]" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Find a paper..."
                className="w-36 bg-transparent text-xs outline-none placeholder:text-[#aaa296]"
              />
            </div>

            <div className="flex items-center gap-2 border border-[#d9d2bf] px-3 py-2.5">
              <ArrowDownUp size={14} className="text-[#8a8573]" />

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-xs outline-none"
              >
                <option>Recently added</option>
                <option>Oldest added</option>
                <option>Title A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-5 flex gap-6 border-b border-[#d9d2bf]">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-xs transition ${
                activeTab === tab
                  ? 'border-[#7153c9] font-medium text-[#5037a5]'
                  : 'border-transparent text-[#8a8573] hover:text-[#1c1b19]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* PAPER LIST */}
        {isLoading ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#8a8573]">
              Loading your research library...
            </p>
          </div>
        ) : isError ? (
          <div className="py-20 text-center">
            <h3 className="font-serif text-2xl">
              Unable to load your library.
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8a8573]">
              {error?.message || 'Something went wrong while loading your saved papers.'}
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 border border-[#7153c9] px-5 py-3 text-xs font-medium text-[#7153c9] transition hover:bg-[#7153c9] hover:text-white"
            >
              Try again
            </button>
          </div>
        ) : filteredPapers.length > 0 ? (
          <div className="divide-y divide-[#d9d2bf]">
            {filteredPapers.map((paper) => (
              <article key={paper.id} className="py-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-xl">
                      {paper.title}
                    </h3>

                    <p className="mt-2 text-xs text-[#8a8573]">
                      {paper.authors || 'Author information unavailable'}
                    </p>

                    {paper.publicationDate && (
                      <p className="mt-1 text-[11px] text-[#8a8573]">
                        Published: {paper.publicationDate}
                      </p>
                    )}
                  </div>

                  <span
                    className={`w-fit shrink-0 px-3 py-1 text-[10px] ${
                      paper.read
                        ? 'bg-[#e7eee4] text-[#496a43]'
                        : 'bg-[#eee9df] text-[#7153c9]'
                    }`}
                  >
                    {paper.read ? 'Read' : 'Unread'}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#716b61]">
                  {paper.abstract || 'No abstract available.'}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-[#8a8573]">
                    Saved {new Date(paper.savedAt).toLocaleDateString()}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {paper.paperUrl && (
                      <a
                        href={paper.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[#d9d2bf] px-3 py-2 text-[11px] text-[#716b61] transition hover:border-[#7153c9] hover:text-[#7153c9]"
                      >
                        View paper
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleReadToggle(paper)}
                      disabled={readMutation.isPending}
                      className="inline-flex items-center gap-1.5 border border-[#d9d2bf] px-3 py-2 text-[11px] text-[#716b61] transition hover:border-[#7153c9] hover:text-[#7153c9] disabled:opacity-50"
                    >
                      <Check size={13} />
                      Mark as {paper.read ? 'unread' : 'read'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemovePaper(paper)}
                      disabled={removeMutation.isPending}
                      aria-label={`Remove ${paper.title} from library`}
                      className="inline-flex items-center gap-1.5 border border-[#d9d2bf] px-3 py-2 text-[11px] text-[#8a8573] transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ece7db]">
              <FolderOpen size={24} className="text-[#8a8573]" />
            </div>

            <h3 className="mt-5 font-serif text-2xl">
              {searchQuery || activeTab !== 'All papers'
                ? 'No matching papers.'
                : 'Your library is waiting.'}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8a8573]">
              {searchQuery || activeTab !== 'All papers'
                ? 'Try changing your search or selecting another tab.'
                : 'When you discover interesting research, save the papers here. Revisit them whenever you need.'}
            </p>
          </div>
        )}

        {actionError && (
          <p role="alert" className="mt-5 text-center text-xs text-red-600">
            {actionError}
          </p>
        )}
      </section>
    </div>
  )
}
