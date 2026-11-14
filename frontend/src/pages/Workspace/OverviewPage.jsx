
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  FolderOpen,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

import { getOverviewData } from '../../api/overview.js'

function formatDate(date) {
  if (!date) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default function OverviewPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['overview'],
    queryFn: getOverviewData,
    staleTime: 60 * 1000,
  })

  const stats = [
    {
      label: 'Saved papers',
      value: data?.stats.savedPapers ?? 0,
      icon: BookOpen,
    },
    {
      label: 'Collections',
      value: data?.stats.collections ?? 0,
      icon: FolderOpen,
    },
    {
      label: 'Research activity',
      value: data?.stats.researchActivity ?? 0,
      icon: Activity,
    },
  ]

  function handleSearch(event) {
    event.preventDefault()

    const query = searchQuery.trim()

    if (!query) {
      navigate('/workspace/discover')
      return
    }

    navigate('/workspace/discover', {
      state: { searchQuery: query },
    })
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">

      {/* WELCOME */}
      <section>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
          <Sparkles size={13} className="text-[#7153c9]" />
          Your research desk
        </div>

        <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-[56px]">
          Ideas begin with
          <span className="text-[#7153c9]"> a question.</span>
        </h1>

        <p className="mt-4 max-w-lg text-sm leading-7 text-[#716b61]">
          Explore research, organize your discoveries, and bring your
          ideas together in one thoughtful workspace.
        </p>
      </section>

      {/* RESEARCH SEARCH */}
      <section className="mt-10 max-w-[780px]">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-3 border border-[#d9d2bf] bg-[#fffdf8] px-4 py-4 shadow-[0_3px_12px_rgba(28,27,25,0.025)] sm:px-5"
        >
          <Search size={19} className="shrink-0 text-[#8a8573]" />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="What are you researching today?"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa296]"
          />

          <button
            type="submit"
            className="flex shrink-0 items-center gap-2 bg-[#1c1b19] px-4 py-2.5 text-xs text-white transition hover:bg-[#45377b]"
          >
            Search
            <ArrowRight size={14} />
          </button>
        </form>

        <p className="mt-3 text-[11px] text-[#999181]">
          Search across research papers, topics, and questions.
        </p>
      </section>

      {/* STATISTICS */}
      <section className="mt-14 grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="border border-[#d9d2bf] bg-[#fffdf8] p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#716b61]">{label}</p>
              <Icon size={17} className="text-[#7153c9]" />
            </div>

            <p className="mt-5 font-serif text-3xl">
              {isPending ? '—' : value}
            </p>
          </div>
        ))}
      </section>

      {/* ERROR STATE */}
      {isError && (
        <div className="mt-8 flex flex-col gap-3 border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-800">
              Couldn't load your research overview.
            </p>
            <p className="mt-1 text-xs text-red-700">
              {error?.message || 'Please try again.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 text-xs font-medium text-red-800"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* LOWER CONTENT */}
      <section className="mt-16 grid gap-12 lg:grid-cols-[1.4fr_0.8fr]">

        {/* RECENT RESEARCH */}
        <div>
          <div className="flex items-center justify-between border-b border-[#d9d2bf] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
                Your research
              </p>

              <h2 className="mt-2 font-serif text-2xl">
                Pick up where you left off.
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate('/workspace/library')}
              className="flex items-center gap-1 text-xs text-[#7153c9]"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          {isPending ? (
            <div className="space-y-5 py-8">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse border-b border-[#e7e1d5] pb-5"
                >
                  <div className="h-4 w-3/4 bg-[#e9e3d8]" />
                  <div className="mt-3 h-3 w-1/2 bg-[#eee9df]" />
                </div>
              ))}
            </div>
          ) : !isError && data?.recentPapers?.length > 0 ? (
            <div className="divide-y divide-[#d9d2bf]">
              {data.recentPapers.map((paper) => (
                <article
                  key={paper.id}
                  className="flex gap-4 py-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#ece7db]">
                    <BookOpen size={18} className="text-[#7153c9]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg leading-snug">
                      {paper.title}
                    </h3>

                    <p className="mt-1 text-xs text-[#8a8573]">
                      {paper.authors || 'Author information unavailable'}
                    </p>

                    <p className="mt-2 text-[11px] text-[#999181]">
                      {paper.source && `${paper.source} · `}
                      Saved {formatDate(paper.savedAt)}
                    </p>
                  </div>

                  {paper.paperUrl && (
                    <a
                      href={paper.paperUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 self-center text-xs text-[#7153c9] hover:text-[#5037a5]"
                    >
                      Open
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : !isError ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ece7db]">
                <BookOpen size={21} className="text-[#8a8573]" />
              </div>

              <h3 className="mt-5 font-serif text-xl">
                Your research story starts here.
              </h3>

              <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-[#8a8573]">
                Papers you save will appear here.
                Start by discovering something interesting.
              </p>

              <button
                type="button"
                onClick={() => navigate('/workspace/discover')}
                className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-[#7153c9]"
              >
                <Compass size={15} />
                Explore research
              </button>
            </div>
          ) : null}
        </div>

        {/* COLLECTIONS */}
        <div>
          <div className="flex items-center justify-between border-b border-[#d9d2bf] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
                Organize your work
              </p>

              <h2 className="mt-2 font-serif text-2xl">
                Collections
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate('/workspace/collections')}
              className="text-xs text-[#7153c9]"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          {isPending ? (
            <div className="mt-8 space-y-3">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse bg-[#eee9df]"
                />
              ))}
            </div>
          ) : !isError && data?.recentCollections?.length > 0 ? (
            <div className="mt-5 space-y-3">
              {data.recentCollections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => navigate('/workspace/collections')}
                  className="flex w-full items-center gap-3 border border-[#d9d2bf] bg-[#fffdf8] p-4 text-left transition hover:border-[#7153c9]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#ece7db]">
                    <FolderOpen size={18} className="text-[#7153c9]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {collection.name}
                    </p>

                    <p className="mt-1 text-[11px] text-[#8a8573]">
                      {collection.paperCount}{' '}
                      {collection.paperCount === 1 ? 'paper' : 'papers'}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-[#8a8573]"
                  />
                </button>
              ))}
            </div>
          ) : !isError ? (
            <div className="mt-8 border border-dashed border-[#c9c1b1] px-5 py-9 text-center">
              <FolderOpen size={24} className="mx-auto text-[#8a8573]" />

              <p className="mt-4 text-sm font-medium">
                No collections yet
              </p>

              <p className="mt-2 text-xs leading-5 text-[#8a8573]">
                Organize papers around topics, projects, or research ideas.
              </p>

              <button
                type="button"
                onClick={() => navigate('/workspace/collections')}
                className="mt-5 inline-flex items-center gap-2 bg-[#1c1b19] px-4 py-2.5 text-xs text-white transition hover:bg-[#45377b]"
              >
                <FolderOpen size={14} />
                Manage collections
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <footer className="mt-12 border-t border-[#d9d2bf] pt-6 text-[10px] text-[#999181]">
        MOUDEL AI · A space for thoughtful research.
      </footer>
    </div>
  )
}
