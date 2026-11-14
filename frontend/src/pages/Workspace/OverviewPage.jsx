
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  FolderOpen,
  Search,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OverviewPage() {
  const navigate = useNavigate()

  const stats = [
    { label: 'Saved papers', value: '0', icon: BookOpen },
    { label: 'Collections', value: '0', icon: FolderOpen },
    { label: 'Research activity', value: '0', icon: Activity },
  ]

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
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/workspace/discover')
          }}
          className="flex items-center gap-3 border border-[#d9d2bf] bg-[#fffdf8] px-4 py-4 shadow-[0_3px_12px_rgba(28,27,25,0.025)] sm:px-5"
        >
          <Search size={19} className="shrink-0 text-[#8a8573]" />

          <input
            type="search"
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
            <p className="mt-5 font-serif text-3xl">{value}</p>
          </div>
        ))}
      </section>

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
              onClick={() => navigate('/workspace/recent')}
              className="flex items-center gap-1 text-xs text-[#7153c9]"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ece7db]">
              <BookOpen size={21} className="text-[#8a8573]" />
            </div>
            <h3 className="mt-5 font-serif text-xl">
              Your research story starts here.
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-[#8a8573]">
              Papers you explore and save will appear here.
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
        </div>
      </section>

      <footer className="mt-12 border-t border-[#d9d2bf] pt-6 text-[10px] text-[#999181]">
        MOuDEL AI · A space for thoughtful research.
      </footer>
    </div>
  )
}
