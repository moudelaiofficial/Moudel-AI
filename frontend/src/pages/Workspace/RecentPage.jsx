
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  History,
  Search,
  Trash2,
  Bookmark,
  Eye,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

import {
  getRecentActivity,
  clearResearchHistory,
} from '../../api/activity.js'

function getActivityLabel(type) {
  const labels = {
    paper_viewed: 'Viewed paper',
    paper_saved: 'Saved paper to Library',
    paper_unsaved: 'Removed paper from Library',
    paper_read: 'Marked paper as read',
    search_performed: 'Performed research search',
  }

  return labels[type] ?? 'Research activity'
}

function getActivityIcon(type) {
  switch (type) {
    case 'paper_viewed':
      return Eye
    case 'paper_saved':
      return Bookmark
    case 'paper_unsaved':
      return Trash2
    case 'paper_read':
      return CheckCircle2
    case 'search_performed':
      return Search
    default:
      return FileText
  }
}

function getActivityTitle(activity) {
  if (activity.activity_type === 'search_performed') {
    return activity.search_query || 'Research search'
  }

  return (
    activity.paper?.title ||
    activity.metadata?.title ||
    'Untitled research paper'
  )
}

function getActivityAuthors(activity) {
  const authors = activity.paper?.authors

  if (Array.isArray(authors)) {
    return authors.join(', ')
  }

  return authors || ''
}

function getActivityPeriod(dateValue) {
  const date = new Date(dateValue)
  const now = new Date()

  if (Number.isNaN(date.getTime())) return 'Older'

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const startOfWeek = new Date(startOfToday)
  const day = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - day)

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  if (date >= startOfToday) return 'Today'
  if (date >= startOfWeek) return 'This week'
  if (date >= startOfMonth) return 'This month'

  return 'Older'
}

function formatActivityDate(dateValue) {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function RecentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState('All activity')

  const {
    data: activities = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['research-activity'],
    queryFn: getRecentActivity,
    staleTime: 30 * 1000,
  })

  const clearMutation = useMutation({
    mutationFn: clearResearchHistory,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['research-activity'],
      })
    },
  })

  const recentlyExploredCount = useMemo(() => {
    const viewedPaperIds = new Set(
      activities
        .filter((activity) => activity.activity_type === 'paper_viewed')
        .map((activity) => activity.paper_id)
        .filter(Boolean)
    )

    return viewedPaperIds.size
  }, [activities])

  const filteredActivities = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return activities.filter((activity) => {
      const title = getActivityTitle(activity).toLowerCase()
      const authors = getActivityAuthors(activity).toLowerCase()
      const activityLabel = getActivityLabel(
        activity.activity_type
      ).toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        authors.includes(normalizedSearch) ||
        activityLabel.includes(normalizedSearch)

      const matchesTime =
        timeFilter === 'All activity' ||
        getActivityPeriod(activity.created_at) === timeFilter

      return matchesSearch && matchesTime
    })
  }, [activities, searchQuery, timeFilter])

  async function handleClearHistory() {
    if (activities.length === 0) return

    const confirmed = window.confirm(
      'Are you sure you want to clear your research activity history? This cannot be undone.'
    )

    if (!confirmed) return

    clearMutation.mutate()
  }

    function handleRevisit(activity) {
    const paperUrl =
        activity.paper?.paper_url ||
        activity.metadata?.pdf_url ||
        activity.metadata?.paper_url

    if (paperUrl) {
        window.open(
        paperUrl,
        '_blank',
        'noopener,noreferrer'
        )
        return
    }

    navigate('/workspace/discover', {
        state: {
        searchQuery: getActivityTitle(activity),
        },
    })
    }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">

      {/* INTRO */}
      <section>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
          <History size={13} className="text-[#7153c9]" />
          Research activity
        </div>

        <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
              Pick up where
              <span className="text-[#7153c9]"> you left off.</span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-7 text-[#716b61]">
              Your recently explored research, all in one place.
              Continue reading and reconnect with ideas.
            </p>
          </div>

          {activities.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={clearMutation.isPending}
              className="inline-flex items-center gap-2 text-xs text-[#8a8573] transition hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {clearMutation.isPending
                ? 'Clearing...'
                : 'Clear history'}
            </button>
          )}
        </div>
      </section>

      {/* ACTIVITY SUMMARY */}
      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="border border-[#d9d2bf] bg-[#fffdf8] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#716b61]">
              Recently explored
            </span>
            <Clock3 size={17} className="text-[#7153c9]" />
          </div>

          <p className="mt-5 font-serif text-3xl">
            {recentlyExploredCount}
          </p>

          <p className="mt-1 text-[11px] text-[#8a8573]">
            Unique research papers viewed
          </p>
        </div>

        <div className="border border-[#d9d2bf] bg-[#fffdf8] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#716b61]">
              Your activity
            </span>
            <BookOpen size={17} className="text-[#7153c9]" />
          </div>

          <p className="mt-5 font-serif text-3xl">
            {activities.length}
          </p>

          <p className="mt-1 text-[11px] text-[#8a8573]">
            Recorded research activities
          </p>
        </div>
      </section>

      {/* HISTORY */}
      <section className="mt-14">
        <div className="flex flex-col justify-between gap-5 border-b border-[#d9d2bf] pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
              Your timeline
            </p>

            <h2 className="mt-2 font-serif text-2xl">
              Recent activity
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-[#d9d2bf] bg-[#fffdf8] px-3 py-2.5">
              <Search size={15} className="text-[#8a8573]" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search history..."
                className="w-36 bg-transparent text-xs outline-none placeholder:text-[#aaa296]"
              />
            </div>

            <select
              value={timeFilter}
              onChange={(event) =>
                setTimeFilter(event.target.value)
              }
              className="border border-[#d9d2bf] bg-[#fffdf8] px-3 py-2.5 text-xs outline-none"
            >
              <option>All activity</option>
              <option>Today</option>
              <option>This week</option>
              <option>This month</option>
              <option>Older</option>
            </select>
          </div>
        </div>

        {/* CLEAR ERROR */}
        {clearMutation.isError && (
          <div className="mt-4 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            Could not clear history: {clearMutation.error?.message}
          </div>
        )}

        {/* LOADING */}
        {isPending && (
          <div className="py-20 text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-[#7153c9]"
            />

            <p className="mt-4 text-sm text-[#8a8573]">
              Loading your research activity...
            </p>
          </div>
        )}

        {/* FETCH ERROR */}
        {isError && (
          <div className="py-16 text-center">
            <h3 className="font-serif text-2xl">
              Couldn't load your activity.
            </h3>

            <p className="mt-3 text-sm text-[#8a8573]">
              {error?.message}
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

        {/* ACTIVITY LIST */}
        {!isPending && !isError && filteredActivities.length > 0 && (
          <div className="divide-y divide-[#d9d2bf]">
            {filteredActivities.map((activity) => {
              const ActivityIcon = getActivityIcon(
                activity.activity_type
              )

              const title = getActivityTitle(activity)
              const authors = getActivityAuthors(activity)

              return (
                <article
                  key={activity.id}
                  className="flex flex-col justify-between gap-4 py-6 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#eee9df] text-[#7153c9]">
                      <ActivityIcon size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7153c9]">
                        {getActivityLabel(activity.activity_type)}
                      </p>

                      <h3 className="mt-1 font-serif text-lg">
                        {title}
                      </h3>

                      {authors && (
                        <p className="mt-1 text-xs text-[#8a8573]">
                          {authors}
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-[#8a8573]">
                        {formatActivityDate(activity.created_at)}
                      </p>
                    </div>
                  </div>

                  {activity.activity_type !== 'search_performed' &&
                    activity.paper && (
                      <button
                        type="button"
                        onClick={() => handleRevisit(activity)}
                        className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-[#7153c9] hover:text-[#5037a5]"
                      >
                        Revisit
                        <ArrowRight size={14} />
                      </button>
                    )}

                  {activity.activity_type === 'search_performed' && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/workspace/discover', {
                          state: { searchQuery: title },
                        })
                      }
                      className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-[#7153c9] hover:text-[#5037a5]"
                    >
                      Search again
                      <ArrowRight size={14} />
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isPending &&
          !isError &&
          filteredActivities.length === 0 && (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ece7db]">
                <Clock3 size={26} className="text-[#7153c9]" />
              </div>

              <h3 className="mt-6 font-serif text-2xl">
                {searchQuery || timeFilter !== 'All activity'
                  ? 'No matching activity.'
                  : 'Your research journey starts here.'}
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8a8573]">
                {searchQuery || timeFilter !== 'All activity'
                  ? 'Try changing your search or time filter.'
                  : 'Papers you explore, searches you perform, and papers you save will appear here.'}
              </p>

              {!searchQuery && timeFilter === 'All activity' && (
                <button
                  type="button"
                  onClick={() => navigate('/workspace/discover')}
                  className="mt-7 inline-flex items-center gap-2 bg-[#7153c9] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#5c40ad]"
                >
                  Discover research
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
      </section>
    </div>
  )
}
