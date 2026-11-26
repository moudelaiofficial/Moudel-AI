
import { useState } from 'react'
import {
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'

const API_BASE_URL = 'https://moudel-ai-api.onrender.com'

export default function SettingsPage() {
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteAccount() {
    const confirmation = window.prompt(
      'This permanently deletes your account and associated personal data. Type DELETE to confirm.'
    )

    if (confirmation !== 'DELETE') {
      return
    }

    setDeleting(true)
    setDeleteError('')

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (!session?.access_token) {
        throw new Error(
          'Your session has expired. Please log in again.'
        )
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/account`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.detail ||
            'Unable to delete your account. Please try again.'
        )
      }

      const { error: signOutError } =
        await supabase.auth.signOut({
          scope: 'local',
        })

      if (signOutError) {
        console.error('Local sign-out error:', signOutError)
      }

      window.location.assign('/')
    } catch (error) {
      console.error('Account deletion failed:', error)

      setDeleteError(
        error.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">

      {/* Page heading */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
          Workspace configuration
        </p>

        <h1 className="mt-5 font-serif text-4xl tracking-tight sm:text-5xl">
          Settings<span className="text-[#7153c9]">.</span>
        </h1>

        <p className="mt-4 max-w-lg text-sm leading-7 text-[#716b61]">
          Manage your account, privacy and personal data.
        </p>
      </section>

      {/* Settings content */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[230px_1fr]">

        {/* Sidebar */}
        <aside className="space-y-1">
          <div className="flex items-center gap-3 bg-[#eae4d8] px-4 py-3 text-xs font-medium text-[#5037a5]">
            <ShieldCheck size={16} />
            Account & Privacy
          </div>
        </aside>

        {/* Main panel */}
        <section className="min-h-[420px] border border-[#d9d2bf] bg-[#fffdf8] p-6 sm:p-9">

          <div>
            <h2 className="font-serif text-2xl">
              Account & Privacy
            </h2>

            <p className="mt-2 text-xs leading-6 text-[#8a8573]">
              Manage your account security and personal data.
            </p>
          </div>

          <div className="mt-8 max-w-lg space-y-6">

            {/* Privacy information */}
            <div className="border border-[#d9d2bf] bg-[#fffdf8] p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  size={20}
                  className="text-[#7153c9]"
                />

                <h3 className="text-sm font-medium">
                  Your research workspace
                </h3>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#716b61]">
                Your account and associated research data are
                managed through authenticated services.
              </p>
            </div>

            {/* Account deletion */}
            <div className="border border-red-200 bg-red-50/40 p-5">
              <div className="flex items-center gap-3">
                <Trash2
                  size={19}
                  className="text-red-600"
                />

                <h3 className="text-sm font-semibold text-red-700">
                  Delete account
                </h3>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#716b61]">
                Permanently delete your account, saved papers,
                collections, preferences and associated personal
                data. This action cannot be undone.
              </p>

              {deleteError && (
                <p
                  role="alert"
                  className="mt-4 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
                >
                  {deleteError}
                </p>
              )}

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />

                {deleting
                  ? 'Deleting account...'
                  : 'Delete my account'}
              </button>

              <p className="mt-3 text-[10px] leading-5 text-[#8a8573]">
                You will be asked to confirm this action before
                the deletion request is submitted.
              </p>
            </div>

          </div>
        </section>
      </div>
    </div>
  )
}
