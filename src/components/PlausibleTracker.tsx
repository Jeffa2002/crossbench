'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

let plausibleReady = false

export default function PlausibleTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (plausibleReady) {
      // Subsequent navigations — just track the pageview
      import('@plausible-analytics/tracker').then(({ track }) => {
        track('pageview', {})
      })
      return
    }

    // First load — init then track
    import('@plausible-analytics/tracker').then(({ init, track }) => {
      init({
        domain: 'crossbench.io',
        captureOnLocalhost: true,
        autoCapturePageviews: false,
      })
      plausibleReady = true
      track('pageview', {})
    })
  }, [pathname])

  return null
}
