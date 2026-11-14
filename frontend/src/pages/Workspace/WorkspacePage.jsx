
import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  Compass,
  FileText,
  FolderOpen,
  History,
  Library,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

const navigation = [
  { label: 'Overview', icon: BookOpen },
  { label: 'Discover', icon: Compass },
  { label: 'My library', icon: Library },
  { label: 'Recent', icon: History },
]

export default function WorkspacePage() {
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const [activeNav, setActiveNav] = useState('Overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [collections, setCollections] = useState([])
  const navigate = useNavigate()

  async function handleLogout() {
    setLoggingOut(true)
    setError('')

    const { error: logoutError } = await supabase.auth.signOut()

    if (logoutError) {
      setError(logoutError.message)
      setLoggingOut(false)
      return
    }

    navigate('/login', { replace: true })
  }

  function handleCreateCollection(event) {
    event.preventDefault()

    const name = collectionName.trim()
    if (!name) return

    setCollections((current) => [
      ...current,
      { id: crypto.randomUUID(), name },
    ])

    setCollectionName('')
    setShowCollectionModal(false)
  }

  return (
    <div className="min-h-screen bg-[#f6f2e8] text-[#1c1b19]">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-[250px] shrink-0 border-r border-[#d9d2bf] bg-[#f2eee3] px-5 py-6 md:flex md:flex-col">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1c1b19] font-serif text-xl italic text-white">
              m
            </div>
            <span className="font-serif text-xl">
              Moudel <span className="text-violet-600">AI</span>
            </span>
          </div>

          <div className="mt-12">
            <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#999181]">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map(({ label, icon: Icon }) => {
                const active = activeNav === label

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveNav(label)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                      active
                        ? 'bg-[#e8e2f8] font-medium text-[#5037a5]'
                        : 'text-[#716b61] hover:bg-[#eae5d9]'
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    {label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="mt-10 border-t border-[#d9d2bf] pt-6">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#999181]">
                Collections
              </p>

              <button
                type="button"
                onClick={() => setShowCollectionModal(true)}
                className="rounded-md p-1 text-[#716b61] transition hover:bg-[#e6e0d3] hover:text-[#5037a5]"
                aria-label="Create collection"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-1">
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <button
                    key={collection.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#716b61] hover:bg-[#eae5d9]"
                  >
                    <FolderOpen size={16} />
                    <span className="truncate">{collection.name}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs leading-5 text-[#999181]">
                  Your research collections will appear here.
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowCollectionModal(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#716b61] transition hover:bg-[#eae5d9]"
              >
                <Plus size={16} />
                New collection
              </button>
            </div>
          </div>

          <div className="mt-auto border-t border-[#d9d2bf] pt-5">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#716b61] transition hover:bg-[#eae5d9]"
            >
              <Settings size={17} />
              Settings
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#716b61] transition hover:bg-[#eae5d9] disabled:opacity-50"
            >
              <LogOut size={17} />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="min-w-0 flex-1">

          {/* TOP BAR */}
          <header className="flex h-[72px] items-center justify-between border-b border-[#d9d2bf] px-5 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1b19] font-serif italic text-white">
                m
              </div>
              <span className="font-serif text-lg">
                Moudel <span className="text-violet-600">AI</span>
              </span>
            </div>

            <div className="hidden items-center gap-2 text-sm text-[#8a8573] md:flex">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-[#1c1b19]">{activeNav}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-[#8a8573] sm:block">
                Research space
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 rounded-full border border-[#d9d2bf] px-3 py-2 text-xs transition hover:bg-[#ebe5d4] disabled:opacity-50 md:hidden"
              >
                <LogOut size={14} />
                Sign out
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6def8] text-sm font-medium text-[#5037a5]">
                M
              </div>
            </div>
          </header>

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

            {/* SEARCH */}
            <section className="mt-10 max-w-[780px]">
              <form
                onSubmit={(event) => event.preventDefault()}
                className="group flex items-center gap-3 border border-[#d9d2bf] bg-[#fffdf8] px-4 py-4 shadow-[0_3px_12px_rgba(28,27,25,0.025)] transition focus-within:border-[#8b78c8] sm:px-5"
              >
                <Search size={19} className="shrink-0 text-[#8a8573]" />

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="What are you researching today?"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa296]"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#8a8573] hover:text-[#1c1b19]"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}

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
                <span className="ml-1 text-[#7153c9]">Discovery coming soon.</span>
              </p>
            </section>

            {/* QUICK STATS */}
            <section className="mt-14 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Saved papers', value: '0', icon: Bookmark },
                { label: 'Collections', value: collections.length, icon: FolderOpen },
                { label: 'Research activity', value: '0', icon: Activity },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="border border-[#d9d2bf] bg-[#fffdf8] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#716b61]">{label}</p>
                    <Icon size={17} className="text-[#7153c9]" strokeWidth={1.7} />
                  </div>
                  <p className="mt-5 font-serif text-3xl">{value}</p>
                </div>
              ))}
            </section>

            {/* LOWER DASHBOARD */}
            <section className="mt-16 grid gap-12 lg:grid-cols-[1.4fr_0.8fr]">

              {/* RECENT ACTIVITY */}
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
                    onClick={() => setActiveNav('Recent')}
                    className="hidden items-center gap-1 text-xs text-[#7153c9] sm:flex"
                  >
                    View all <ArrowUpRight size={14} />
                  </button>
                </div>

                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ece7db]">
                    <FileText size={21} className="text-[#8a8573]" />
                  </div>
                  <h3 className="mt-5 font-serif text-xl">
                    Nothing here just yet.
                  </h3>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-[#8a8573]">
                    Papers you explore and save will find their place here.
                    Your research journey starts with the first discovery.
                  </p>
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
                    onClick={() => setShowCollectionModal(true)}
                    className="flex h-8 w-8 items-center justify-center border border-[#d9d2bf] transition hover:bg-[#ebe5d4]"
                    aria-label="Create collection"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="py-8">
                  {collections.length > 0 ? (
                    <div className="space-y-2">
                      {collections.map((collection) => (
                        <div
                          key={collection.id}
                          className="flex items-center gap-3 border border-[#d9d2bf] bg-[#fffdf8] p-4"
                        >
                          <FolderOpen size={18} className="text-[#7153c9]" />
                          <span className="flex-1 truncate text-sm">
                            {collection.name}
                          </span>
                          <ChevronDown size={15} className="text-[#8a8573]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#c9c1b1] px-5 py-9 text-center">
                      <FolderOpen size={24} className="mx-auto text-[#8a8573]" />
                      <p className="mt-4 text-sm font-medium">
                        Create your first collection
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#8a8573]">
                        Group papers around a topic, project, or research idea.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowCollectionModal(true)}
                        className="mt-5 inline-flex items-center gap-2 bg-[#1c1b19] px-4 py-2.5 text-xs text-white transition hover:bg-[#45377b]"
                      >
                        <Plus size={14} />
                        New collection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-[#d9d2bf] pt-6 text-[10px] text-[#999181] sm:flex-row">
              <span>MOuDEL AI · A space for thoughtful research.</span>
              <span>Built for curiosity.</span>
            </footer>

            {error && (
              <p role="alert" className="mt-5 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        </main>
      </div>

      {/* CREATE COLLECTION MODAL */}
      {showCollectionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCollectionModal(false)
            }
          }}
        >
          <div className="w-full max-w-md border border-[#d9d2bf] bg-[#fffdf8] p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
                  Research organization
                </p>
                <h2 className="mt-3 font-serif text-2xl">
                  New collection
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowCollectionModal(false)}
                className="text-[#8a8573] hover:text-[#1c1b19]"
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateCollection}>
              <label
                htmlFor="collection-name"
                className="mt-7 block text-xs font-medium text-[#716b61]"
              >
                Collection name
              </label>
              <input
                id="collection-name"
                autoFocus
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                placeholder="e.g. Machine Learning Research"
                className="mt-2 w-full border border-[#d9d2bf] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[#8b78c8]"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-4 py-2.5 text-xs text-[#716b61] hover:bg-[#eee9dd]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!collectionName.trim()}
                  className="bg-[#1c1b19] px-5 py-2.5 text-xs text-white transition hover:bg-[#45377b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
