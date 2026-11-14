
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { LEGAL_VERSIONS } from '../../config/legalVersions.js'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [consentLoading, setConsentLoading] = useState(true)
  const [consentRequired, setConsentRequired] = useState(false)
  const [error, setError] = useState('')

  const location = useLocation()
  const isConsentPage = location.pathname === '/consent'

  // Authentication state
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setSession(null)
      } else {
        setSession(data.session)
      }

      setAuthLoading(false)
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return

      setSession(newSession)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Consent verification
  useEffect(() => {
    let mounted = true

    async function verifyConsent() {
      if (authLoading) return

      if (!session?.user?.id) {
        setConsentLoading(false)
        return
      }

      setConsentLoading(true)
      setError('')

      try {
        const { data, error: consentError } = await supabase
          .from('user_consents')
          .select('policy_version, accepted_at')
          .eq('user_id', session.user.id)
          .eq('consent_type', 'terms_and_conditions')
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (consentError) throw consentError

        if (!mounted) return

        const isCurrent =
          data?.policy_version === LEGAL_VERSIONS.terms

        setConsentRequired(!isCurrent)
      } catch (err) {
        if (!mounted) return

        setError(
          err?.message || 'Unable to verify your Terms acceptance.',
        )
      } finally {
        if (mounted) setConsentLoading(false)
      }
    }

    verifyConsent()

    return () => {
      mounted = false
    }
  }, [session?.user?.id, authLoading, location.pathname])

  if (authLoading || (session && consentLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f2e8]">
        <p className="font-serif text-lg text-[#5f5b50]">
          Preparing your research desk...
        </p>
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f6f0] px-5">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl">
            Unable to verify your account
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#716b61]">
            We couldn't verify your Terms acceptance. Please check your
            connection and try again.
          </p>

          <p className="mt-3 text-xs text-red-600">
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-[#1c1b19] px-6 py-3 text-sm text-white hover:bg-violet-700"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  if (consentRequired && !isConsentPage) {
    return <Navigate to="/consent" replace />
  }

  if (!consentRequired && isConsentPage) {
    return <Navigate to="/workspace" replace />
  }

  return children
}
