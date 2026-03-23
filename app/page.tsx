'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { Upload, Music, Layers, Wand2, ChevronRight, Disc3, Radio, AudioWaveform } from 'lucide-react'
import axios from 'axios'

export default function HomePage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ title: '', artist: '', album: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setSelectedFile(accepted[0])
      setError('')
      const name = accepted[0].name.replace(/\.[^/.]+$/, '')
      setMeta(m => ({ ...m, title: m.title || name }))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'] },
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
  })

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('title', meta.title || selectedFile.name)
      form.append('artist', meta.artist)
      form.append('album', meta.album)

      const res = await axios.post('/api/upload', form, {
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      const songId = res.data.song.id
      // Trigger processing
      await axios.post('/api/process', { songId })
      router.push(`/player?id=${songId}`)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Upload failed. Check that the server is running.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center">
            <AudioWaveform size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            STEMIFY
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-text-secondary">
          <Link href="/library" className="hover:text-text-primary transition-colors flex items-center gap-1.5">
            <Disc3 size={14} /> Library
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-text-secondary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" style={{ background: 'var(--accent-green)' }} />
              AI-powered stem separation
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Split any song into{' '}
              <span className="text-glow-cyan" style={{ color: 'var(--accent-cyan)' }}>
                pure stems
              </span>
            </h1>
            <p className="text-text-secondary text-lg max-w-md mx-auto">
              Isolate vocals, bass, drums, instruments — and even individual SATB voice parts. Detect key modulations. Mute, solo, download.
            </p>
          </div>

          {/* Features row */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { icon: Layers, label: '4-Stem AI Separation', sub: 'Vocals · Bass · Drums · Instruments' },
              { icon: Radio, label: 'SATB Voice Detection', sub: 'Soprano · Alto · Tenor · Baritone' },
              { icon: Wand2, label: 'Modulation Analysis', sub: 'Key changes & BPM detected' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="glass-card p-4 text-center">
                <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                  style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>
                  <Icon size={16} />
                </div>
                <div className="text-xs font-semibold text-text-primary mb-0.5">{label}</div>
                <div className="text-xs text-text-muted">{sub}</div>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-cyan-400 bg-cyan-400/5'
                : selectedFile
                ? 'border-purple-500/60 bg-purple-500/5'
                : 'border-white/10 hover:border-white/20 bg-white/2'
            }`}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(123,47,255,0.2)', color: 'var(--accent-purple)' }}>
                  <Music size={24} />
                </div>
                <p className="font-semibold text-text-primary">{selectedFile.name}</p>
                <p className="text-sm text-text-secondary">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change file
                </p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)' }}>
                  <Upload size={28} />
                </div>
                <p className="text-lg font-semibold mb-1">
                  {isDragActive ? 'Drop it here' : 'Drop your audio file here'}
                </p>
                <p className="text-sm text-text-secondary">
                  MP3, WAV, FLAC, OGG, M4A · Up to 200MB
                </p>
              </>
            )}
          </div>

          {/* Metadata fields */}
          {selectedFile && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(['title', 'artist', 'album'] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">{field}</label>
                  <input
                    type="text"
                    value={meta[field]}
                    onChange={e => setMeta(m => ({ ...m, [field]: e.target.value }))}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-lg text-sm bg-red-400/10 border border-red-400/20">
              <p className="text-red-400 font-semibold mb-1">Upload Failed</p>
              <p className="text-red-300/80">{error}</p>
              {error.includes('local') && (
                <p className="text-text-muted text-xs mt-2">
                  Run <code className="bg-white/10 px-1 rounded">npm run dev</code> on your machine and open{' '}
                  <code className="bg-white/10 px-1 rounded">http://localhost:3000</code>
                </p>
              )}
            </div>
          )}

          {/* Upload button */}
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="btn-primary text-base px-8 py-3"
            >
              {uploading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing…'}
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Separate Stems
                  <ChevronRight size={16} />
                </>
              )}
            </button>
            <Link href="/library">
              <button className="btn-ghost py-3 px-6">View Library</button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-4 text-center text-xs text-text-muted">
        Stemify — Local AI Audio Processing · No external APIs · All processing on your machine
      </footer>
    </div>
  )
}
