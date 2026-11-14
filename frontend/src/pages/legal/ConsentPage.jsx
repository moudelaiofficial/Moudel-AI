
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { LEGAL_VERSIONS } from '../../config/legalVersions.js'

export default function ConsentPage() {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleAccept(event) {
    event.preventDefault()
    if (!accepted || loading) return

    setLoading(true)
    setError('')

    try {
      const { error: consentError } = await supabase.rpc(
        'accept_current_terms',
      )

      if (consentError) throw consentError

      navigate('/workspace', { replace: true })
    } catch (err) {
      setError(err?.message || 'Unable to record your acceptance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6f0] px-5 py-12 text-[#1c1b19]">
      <section className="w-full max-w-xl rounded-2xl border border-[#e4ddcf] bg-white p-7 shadow-sm sm:p-10">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-violet-600">
          Updated legal agreement
        </p>

        <h1 className="font-serif text-4xl tracking-tight">
          A quick review before continuing.
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#716b61]">
          Our Terms & Conditions have been updated. Please review the latest
          version before returning to your research workspace.
        </p>

        <div className="mt-6 rounded-xl border border-[#e9e3d8] bg-[#faf9f6] p-5">
          <p className="text-sm font-medium">Current Terms version</p>
          <p className="mt-1 text-sm text-[#716b61]">
            {LEGAL_VERSIONS.terms}
          </p>

          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-violet-700 underline underline-offset-2"
          >
            Read Terms & Conditions
          </Link>

          <p className="mt-4 text-xs leading-5 text-[#716b61]">
            You can also review our{' '}
            <Link to="/privacy" target="_blank" className="text-violet-700 underline">
              Privacy Policy
            </Link>.
          </p>
        </div>

        <form onSubmit={handleAccept} className="mt-6 space-y-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#514c44]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
              required
            />
            <span>
              I have read and agree to the updated Terms & Conditions.
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!accepted || loading}
            className="h-12 w-full rounded-full bg-[#1c1b19] text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving acceptance…' : 'Accept and continue'}
          </button>
        </form>
      </section>
    </main>
  )
}
