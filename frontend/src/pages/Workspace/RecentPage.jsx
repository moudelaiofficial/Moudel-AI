
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  History,
  Search,
  Trash2,
} from 'lucide-react'

export default function RecentPage() {
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState('All activity')

  // Temporary data source. Connect to actual research activity later.
  const [recentPapers, setRecentPapers] = useState([])

  const filteredPapers = useMemo(() => {
    return recentPapers.filter((paper) => {
      const matchesSearch =
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTime =
        timeFilter === 'All activity' || paper.period === timeFilter

      return matchesSearch && matchesTime
    })
  }, [recentPapers, searchQuery, timeFilter])

  function clearHistory() {
    setRecentPapers([])
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

          {recentPapers.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-2 text-xs text-[#8a8573] transition hover:text-red-600"
            >
              <Trash2 size={14} />
              Clear history
            </button>
          )}
        </div>
      </section>

      {/* ACTIVITY SUMMARY */}
      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="border border-[#d9d2bf] bg-[#fffdf8] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#716b61]">Recently explored</span>
            <Clock3 size={17} className="text-[#7153c9]" />
          </div>
          <p className="mt-5 font-serif text-3xl">{recentPapers.length}</p>
          <p className="mt-1 text-[11px] text-[#8a8573]">Research papers</p>
        </div>

        <div className="border border-[#d9d2bf] bg-[#fffdf8] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#716b61]">Your activity</span>
            <BookOpen size={17} className="text-[#7153c9]" />
          </div>
          <p className="mt-5 font-serif text-3xl">
            {recentPapers.length > 0 ? 'Active' : 'Ready'}
          </p>
          <p className="mt-1 text-[11px] text-[#8a8573]">
            {recentPapers.length > 0
              ? 'Keep exploring research'
              : 'Start discovering papers'}
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
            <h2 className="mt-2 font-serif text-2xl">Recent activity</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-[#d9d2bf] bg-[#fffdf8] px-3 py-2.5">
              <Search size={15} className="text-[#8a8573]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search history..."
                className="w-36 bg-transparent text-xs outline-none placeholder:text-[#aaa296]"
              />
            </div>

            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
              className="border border-[#d9d2bf] bg-[#fffdf8] px-3 py-2.5 text-xs outline-none"
            >
              <option>All activity</option>
              <option>Today</option>
              <option>This week</option>
              <option>This month</option>
            </select>
          </div>
        </div>

        {filteredPapers.length > 0 ? (
          <div className="divide-y divide-[#d9d2bf]">
            {filteredPapers.map((paper) => (
              <article
                key={paper.id}
                className="flex flex-col justify-between gap-4 py-6 sm:flex-row sm:items-center"
              >
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#eee9df] text-[#7153c9]">
                    <FileText size={19} />
                  </div>

                  <div>
                    <h3 className="font-serif text-lg">{paper.title}</h3>
                    <p className="mt-1 text-xs text-[#8a8573]">
                      {paper.authors}
                    </p>
                    <p className="mt-2 text-[11px] text-[#8a8573]">
                      Last opened: {paper.lastOpened}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/workspace/discover')}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#7153c9] hover:text-[#5037a5]"
                >
                  Revisit <ArrowRight size={14} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ece7db]">
              <Clock3 size={26} className="text-[#7153c9]" />
            </div>

            <h3 className="mt-6 font-serif text-2xl">
              {searchQuery
                ? 'Nothing matches your search.'
                : 'Your research journey starts here.'}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8a8573]">
              {searchQuery
                ? 'Try another paper title or author.'
                : 'Papers you explore will appear here, making it easy to return to something interesting.'}
            </p>

            {!searchQuery && (
              <button
                type="button"
                onClick={() => navigate('/workspace/discover')}
                className="mt-7 inline-flex items-center gap-2 bg-[#7153c9] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#5c40ad]"
              >
                Discover research <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
