
import { useEffect, useState } from 'react'

const MEASUREMENT_ID = 'G-W4W1KKVZJ6'
const CONSENT_KEY = 'moudel_analytics_consent'

function enableAnalytics() {
  if (window.__moudelAnalyticsInitialized) return

  window.__moudelAnalyticsInitialized = true
  window.__analyticsConsent = true

  window.dataLayer = window.dataLayer || []

  window.gtag = function () {
    window.dataLayer.push(arguments)
  }

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })

  window.gtag('consent', 'update', {
    analytics_storage: 'granted',
  })

  window.gtag('js', new Date())

  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`

  document.head.appendChild(script)

  window.dispatchEvent(new Event('moudel-analytics-ready'))
}

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (choice === 'accepted') {
      enableAnalytics()
    }
  }, [choice])

  function handleChoice(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value)
    } catch {
      // If storage is unavailable, retain the choice for this session.
    }

    setChoice(value)

    if (value === 'accepted') {
      enableAnalytics()
    }
  }

  if (choice !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Analytics cookie preferences"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[9999] mx-auto max-w-2xl rounded-2xl border border-[#e4ddcf] bg-white p-5 shadow-2xl sm:p-6"
    >
      <h2 className="text-base font-semibold text-[#1c1b19]">
        Your privacy matters
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#716b61]">
        We use analytics to understand how visitors use Moudel AI
        and improve the research experience. Analytics is optional
        and will only be enabled if you agree.
        {' '}
        <a
          href="/cookies"
          className="text-violet-700 underline underline-offset-2"
        >
          Learn more
        </a>
      </p>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => handleChoice('rejected')}
          className="rounded-full border border-[#d8d1c5] px-5 py-2.5 text-sm font-medium text-[#514c44] transition hover:bg-[#f8f6f0]"
        >
          Reject analytics
        </button>

        <button
          type="button"
          onClick={() => handleChoice('accepted')}
          className="rounded-full bg-[#1c1b19] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          Accept analytics
        </button>
      </div>
    </div>
  )
}
