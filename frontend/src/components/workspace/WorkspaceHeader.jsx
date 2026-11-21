
import { useState } from 'react'
import {
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

export default function WorkspaceHeader() {
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#d9d2bf] bg-[#f6f2e8]/95 px-5 backdrop-blur sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="rounded-lg p-2 text-[#716b61] transition hover:bg-[#ebe5d4] md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <div className="flex items-center gap-2 text-sm text-[#8a8573]">
            <span className="hidden sm:inline">Workspace</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-[#1c1b19]">Research desk</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            disabled
            className="rounded-full p-2 text-[#8a8573] opacity-50"
          >
            <Bell size={18} />
          </button>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6def8] text-sm font-medium text-[#5037a5]">
            M
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="hidden items-center gap-2 rounded-full border border-[#d9d2bf] px-4 py-2 text-xs text-[#716b61] transition hover:bg-[#ebe5d4] disabled:opacity-50 sm:flex"
          >
            <LogOut size={14} />
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative z-10 flex h-full w-[280px] flex-col border-r border-[#d9d2bf] bg-[#f2eee3] p-6">
            <div className="flex items-center justify-between">
              <span className="font-serif text-xl">
                Moudel <span className="text-violet-600"></span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X size={19} />
              </button>
            </div>

            <nav className="mt-10 space-y-2">
              {[
                ['Overview', '/workspace'],
                ['Discover', '/workspace/discover'],
                ['My Library', '/workspace/library'],
                ['Recent', '/workspace/recent'],
                ['Collections', '/workspace/collections'],
                ['Settings', '/workspace/settings'],
              ].map(([label, path]) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate(path)
                  }}
                  className="w-full rounded-lg px-3 py-3 text-left text-sm text-[#716b61] transition hover:bg-[#e8e2f8] hover:text-[#5037a5]"
                >
                  {label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-auto flex items-center gap-3 border-t border-[#d9d2bf] pt-5 text-sm text-[#716b61]"
            >
              <LogOut size={17} />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
