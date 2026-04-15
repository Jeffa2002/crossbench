'use client'

import { useEffect } from 'react'

export default function PlausibleTracker() {
  useEffect(() => {
    import('@plausible-analytics/tracker').then(({ init }) => {
      init({
        domain: 'crossbench.io',
        captureOnLocalhost: true, // allow testing before DNS is live
      })
    })
  }, [])

  return null
}
