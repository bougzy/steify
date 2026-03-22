import { Suspense } from 'react'
import PlayerClient from './PlayerClient'

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="spinner mx-auto" style={{ width: 32, height: 32 }} />
          <p className="text-text-secondary text-sm">Loading player…</p>
        </div>
      </div>
    }>
      <PlayerClient />
    </Suspense>
  )
}
