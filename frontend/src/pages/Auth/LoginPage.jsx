
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) throw loginError

      navigate('/workspace', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to log in. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#1c1b19]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#e5dfd3] px-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1c1b19] font-serif text-lg italic text-white">
            m
          </span>
          <span className="font-serif text-lg">
            Moudel <span className="text-violet-600">AI</span>
          </span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-[#716b61] transition hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-12 md:grid-cols-[1fr_440px] md:px-10">
        <div className="hidden md:block">
          <p className="mb-6 text-xs uppercase tracking-[0.22em] text-violet-600">
            Your research, right where you left it
          </p>

          <h1 className="max-w-xl font-serif text-5xl leading-[1.12] tracking-tight lg:text-6xl">
            Return to the questions that matter.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[#716b61]">
            Your papers, ideas, and research journey belong in one place.
            Pick up where curiosity left off.
          </p>

          <div className="mt-10 space-y-4 text-sm text-[#514c44]">
            <p>Keep your research organized by project.</p>
            <p>Return to saved papers and notes.</p>
            <p>Keep building your understanding over time.</p>
          </div>

          <div className="mt-16 border-t border-[#e2dccf] pt-4 text-xs text-[#8c8478]">
            MO UDEL RESEARCH JOURNAL · EARLY DEVELOPMENT
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e4ddcf] bg-white">
              <BookOpen size={21} className="text-violet-600" />
            </div>

            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-violet-600">
              Welcome back
            </p>

            <h2 className="font-serif text-4xl tracking-tight">
              Continue your inquiry.
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#716b61]">
              Log in to return to your research space.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-lg border border-[#ded7ca] bg-white px-4 text-sm outline-none transition placeholder:text-[#aaa296] focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-lg border border-[#ded7ca] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#aaa296] focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8c8478] hover:text-black"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1c1b19] px-5 text-sm font-medium text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in…' : 'Log in'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#716b61]">
            New to Moudel AI?{' '}
            <Link
              to="/signup"
              className="font-medium text-violet-700 underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
