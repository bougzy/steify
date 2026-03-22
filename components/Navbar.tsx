'use client'

import Link from 'next/link'
import { AudioWaveform, Disc3, Plus } from 'lucide-react'

interface NavbarProps {
  showUpload?: boolean
  showLibrary?: boolean
}

export default function Navbar({ showUpload = true, showLibrary = true }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/5 sticky top-0 z-50"
      style={{ background: 'rgba(8,10,15,0.85)', backdropFilter: 'blur(16px)' }}>
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' }}>
          <AudioWaveform size={16} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          STEMIFY
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {showLibrary && (
          <Link href="/library"
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Disc3 size={14} />
            <span className="hidden sm:inline">Library</span>
          </Link>
        )}
        {showUpload && (
          <Link href="/">
            <button className="btn-primary text-xs py-2 px-4">
              <Plus size={14} />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </Link>
        )}
      </div>
    </nav>
  )
}
