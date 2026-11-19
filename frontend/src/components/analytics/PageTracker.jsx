
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function PageTracker() {
  const location = useLocation()
  const lastTrackedPage = useRef(null)

  useEffect(() => {
    function trackPageView() {
      if (
        typeof window.gtag !== 'function' ||
        window.__analyticsConsent !== true
      ) {
        return
      }

      const pagePath = location.pathname + location.search

      if (lastTrackedPage.current === pagePath) return

      lastTrackedPage.current = pagePath

      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: pagePath,
      })
    }

    window.addEventListener('moudel-analytics-ready', trackPageView)

    trackPageView()

    return () => {
      window.removeEventListener(
        'moudel-analytics-ready',
        trackPageView,
      )
    }
  }, [location.pathname, location.search])

  return null
}
