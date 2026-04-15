'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function PlausibleTracker() {
  const pathname = usePathname()
  const initialized = useRef(false)

  // Initialise once
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    import('@plausible-analytics/tracker').then(({ init }) => {
      init({
        domain: 'crossbench.io',
        captureOnLocalhost: true,
        // Disable built-in SPA tracking — we handle it via usePathname below
        autoCapturePageviews: false,
      })
    })
  }, [])

  // Fire a pageview on every route change (including initial load)
  useEffect(() => {
    if (!initialized.current) return
    import('@plausible-analytics/tracker').then(({ track }) => {
      track('pageview')
    })
  }, [pathname])

  return null
}
