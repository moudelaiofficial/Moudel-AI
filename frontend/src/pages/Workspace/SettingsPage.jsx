
import { useState } from 'react'
import {
  UserRound,
  Palette,
  BookOpen,
  Bell,
  ShieldCheck,
  Save,
  Moon,
  Sun,
  Monitor,
  Trash2,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'

const API_BASE_URL = 'https://moudel-ai-api.onrender.com'

const sections = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'research', label: 'Research', icon: BookOpen },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [theme, setTheme] = useState('light')
  const [defaultSort, setDefaultSort] = useState('Relevance')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [researchUpdates, setResearchUpdates] = useState(true)

  const [saveMessage, setSaveMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [userCheckMessage, setUserCheckMessage] = useState('')
  const [checkingUser, setCheckingUser] = useState(false)

  function handleSave(event) {
    event.preventDefault()

    setSaveMessage(
      'Changes are currently local and have not been saved to your account.'
    )
  }
  async function testConsentIdentity() {
    const { data, error } = await supabase.rpc(
      'debug_current_auth_user'
    )

    console.log('Consent identity:', data)
    console.log('Consent identity error:', error)
  }
  // Temporary diagnostic: verify the currently authenticated Supabase user.
  async function checkCurrentUser() {
    setCheckingUser(true)
    setUserCheckMessage('Checking authenticated user...')

    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      if (!data?.user?.id) {
        setUserCheckMessage('No authenticated user found.')
        console.log('Authenticated user:', null)
        return
      }

      console.log('Authenticated user ID:', data.user.id)
      console.log('Authenticated user email:', data.user.email)

      setUserCheckMessage(
        `Authenticated user found. ID: ${data.user.id}`
      )
    } catch (error) {
      console.error('User verification failed:', error)
      setUserCheckMessage(
        error.message || 'Unable to verify authenticated user.'
      )
    } finally {
      setCheckingUser(false)
    }
  }

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
          result.detail || 'Unable to delete your account. Please try again.'
        )
      }

      const { error: signOutError } = await supabase.auth.signOut({
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

  function renderSection() {
    switch (activeSection) {
      case 'profile':
        return (
          <>
            <SectionHeading
              title="Profile settings"
              description="Manage how you appear in your research workspace."
            />

            <div className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="display-name"
                  className="mb-2 block text-xs font-medium"
                >
                  Display name
                </label>

                <input
                  id="display-name"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  placeholder="Your name"
                  className="w-full max-w-lg border border-[#d9d2bf] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#7153c9]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-bio"
                  className="mb-2 block text-xs font-medium"
                >
                  About you
                </label>

                <textarea
                  id="profile-bio"
                  rows={4}
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  placeholder="Tell us a little about your research interests..."
                  className="w-full max-w-lg resize-none border border-[#d9d2bf] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#7153c9]"
                />
              </div>
            </div>
          </>
        )

      case 'appearance':
        return (
          <>
            <SectionHeading
              title="Appearance"
              description="Choose how your workspace looks."
            />

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={`flex items-center gap-3 border p-4 text-sm transition ${
                    theme === id
                      ? 'border-[#7153c9] bg-[#eee9df] text-[#5037a5]'
                      : 'border-[#d9d2bf] hover:border-[#a99bd2]'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-[#8a8573]">
              Appearance selection is a local preference preview.
              Theme switching is not connected yet.
            </p>
          </>
        )

      case 'research':
        return (
          <>
            <SectionHeading
              title="Research preferences"
              description="Set your default research discovery experience."
            />

            <div className="mt-8 max-w-lg">
              <label
                htmlFor="default-sort"
                className="mb-2 block text-xs font-medium"
              >
                Default search sorting
              </label>

              <select
                id="default-sort"
                value={defaultSort}
                onChange={(event) =>
                  setDefaultSort(event.target.value)
                }
                className="w-full border border-[#d9d2bf] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7153c9]"
              >
                <option>Relevance</option>
                <option>Newest first</option>
                <option>Oldest first</option>
              </select>
            </div>
          </>
        )

      case 'notifications':
        return (
          <>
            <SectionHeading
              title="Notifications"
              description="Choose which updates you'd like to receive."
            />

            <div className="mt-8 max-w-lg space-y-5">
              <ToggleSetting
                title="Email notifications"
                description="Receive important updates through email."
                checked={emailNotifications}
                onChange={setEmailNotifications}
              />

              <ToggleSetting
                title="Research updates"
                description="Stay informed about new research and platform updates."
                checked={researchUpdates}
                onChange={setResearchUpdates}
              />
            </div>
          </>
        )

      case 'privacy':
        return (
          <>
            <SectionHeading
              title="Privacy and security"
              description="Manage your account security and personal data."
            />
                    <button
            type="button"
            onClick={testConsentIdentity}
            className="mt-4 border px-4 py-2 text-xs"
          >
            Test consent identity
          </button>
            <div className="mt-8 max-w-lg space-y-6">
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

              {/* Temporary authenticated-user diagnostic */}
              <div className="border border-[#d9d2bf] bg-[#fffdf8] p-5">
                <h3 className="text-sm font-medium">
                  Authentication diagnostics
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#716b61]">
                  Temporarily verify whether your current Supabase
                  session identifies an authenticated user.
                </p>

                {userCheckMessage && (
                  <p
                    role="status"
                    className="mt-3 break-all text-xs leading-5 text-[#5037a5]"
                  >
                    {userCheckMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={checkCurrentUser}
                  disabled={checkingUser}
                  className="mt-4 border border-[#7153c9] px-4 py-3 text-xs font-medium text-[#5037a5] transition hover:bg-[#eee9df] disabled:opacity-50"
                >
                  {checkingUser
                    ? 'Checking...'
                    : 'Check authenticated user'}
                </button>
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
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
          Workspace configuration
        </p>

        <h1 className="mt-5 font-serif text-4xl tracking-tight sm:text-5xl">
          Settings<span className="text-[#7153c9]">.</span>
        </h1>

        <p className="mt-4 max-w-lg text-sm leading-7 text-[#716b61]">
          Configure your workspace and shape your research experience.
        </p>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-1">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveSection(id)
                setSaveMessage('')
                setDeleteError('')
                setUserCheckMessage('')
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-xs transition ${
                activeSection === id
                  ? 'bg-[#eae4d8] font-medium text-[#5037a5]'
                  : 'text-[#716b61] hover:bg-[#eee9df]'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </aside>

        <section className="min-h-[420px] border border-[#d9d2bf] bg-[#fffdf8] p-6 sm:p-9">
          <form onSubmit={handleSave}>
            {renderSection()}

            {activeSection !== 'privacy' && (
              <div className="mt-10 border-t border-[#e5dfd2] pt-6">
                {saveMessage && (
                  <p
                    role="status"
                    className="mb-4 text-xs text-[#8a8573]"
                  >
                    {saveMessage}
                  </p>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-[#7153c9] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#5c40ad]"
                >
                  <Save size={14} />
                  Save preferences
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}

function SectionHeading({ title, description }) {
  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>

      <p className="mt-2 text-xs leading-6 text-[#8a8573]">
        {description}
      </p>
    </div>
  )
}

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e5dfd2] pb-5">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>

        <p className="mt-1 text-xs leading-5 text-[#8a8573]">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[#7153c9]' : 'bg-[#c9c2b5]'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
