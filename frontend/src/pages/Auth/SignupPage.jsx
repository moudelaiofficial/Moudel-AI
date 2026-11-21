
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

import { LEGAL_VERSIONS } from '../../config/legalVersions.js'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSignup(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!acceptedTerms) {
      setError('Please accept the Terms & Conditions before creating your account.')
      return
    }

    if (loading) return

    setLoading(true)

    try {
      const acceptedAt = new Date().toISOString()

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            terms_accepted: true,
            terms_version: LEGAL_VERSIONS.terms,
            terms_accepted_at: acceptedAt,
          },
        },
      })

      if (signupError) throw signupError

      setSuccess(
        data.session
          ? 'Account created successfully!'
          : 'Account created. Check your email for a verification link.',
      )
    } catch (err) {
      setError(err?.message || 'Could not create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#1c1b19]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#e5dfd3] px-5 sm:px-10">
      <Link to="/" className="flex items-center gap-2.5">
        <img
          src="/moudel-favicon.png"
          alt="Moudel AI logo"
          className="h-9 w-9 object-contain"
        />

        <span className="font-serif text-lg">
          Moudel <span className="text-violet-600"></span>
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
        {/* Left introduction */}
        <div className="hidden md:block">
          <p className="mb-6 text-xs uppercase tracking-[0.22em] text-violet-600">
            Your research, with room to grow
          </p>

          <h1 className="max-w-xl font-serif text-5xl leading-[1.12] tracking-tight lg:text-6xl">
            Every great idea starts with a question.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[#716b61]">
            Create a space for your questions, papers, and discoveries. Pick up
            where you left off, whenever inspiration returns.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'Keep your research organized by project',
              'Save papers and the ideas they inspire',
              'Build your understanding over time',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm text-[#514c44]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d0c2]">
                  <Check size={13} className="text-violet-600" />
                </span>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-[#e2dccf] pt-4 text-xs text-[#8c8478]">
            MO UDEL RESEARCH JOURNAL · EARLY DEVELOPMENT
          </div>
        </div>

        {/* Signup form */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e4ddcf] bg-white">
              <BookOpen size={21} className="text-violet-600" />
            </div>

            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-violet-600">
              Create your account
            </p>

            <h2 className="font-serif text-4xl tracking-tight">
              Begin with a question.
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#716b61]">
              Set up your account and make space for your next discovery.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            {/* Email */}
            <div>
              <label
                htmlFor="signup-email"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>

              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-lg border border-[#ded7ca] bg-white px-4 text-sm outline-none transition placeholder:text-[#aaa296] focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="h-12 w-full rounded-lg border border-[#ded7ca] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#aaa296] focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8c8478] hover:text-black"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <p className="mt-2 text-xs text-[#8c8478]">
                Use at least 8 characters.
              </p>
            </div>

            {/* Legal consent */}
            <div className="rounded-xl border border-[#e4ddcf] bg-white/70 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  required
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-violet-600"
                />

                <span className="text-sm leading-6 text-[#514c44]">
                  I have read and agree to the{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900"
                  >
                    Terms & Conditions
                  </Link>
                  .
                </span>
              </label>

              <p className="mt-3 pl-7 text-xs leading-5 text-[#8c8478]">
                Please review our{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-700 underline underline-offset-2 hover:text-violet-900"
                >
                  Privacy Policy
                </Link>
                {' '}to understand how your information is handled.
              </p>

              <div className="mt-3 border-t border-[#e9e3d8] pt-3 pl-7">
                <Link
                  to="/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#716b61] underline underline-offset-2 hover:text-violet-700"
                >
                  Cookie Policy
                </Link>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                {success}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1c1b19] px-5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#e4ddcf]" />
            <span className="text-xs text-[#8c8478]">
              Already have an account?
            </span>
            <div className="h-px flex-1 bg-[#e4ddcf]" />
          </div>

          <Link
            to="/login"
            className="flex h-12 w-full items-center justify-center rounded-full border border-[#dcd4c7] text-sm font-medium transition hover:border-[#1c1b19] hover:bg-white"
          >
            Log in instead
          </Link>
        </div>
      </section>
    </main>
  )
}
