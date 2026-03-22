'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AudioWaveform, ChevronLeft, Music2, Trash2, Play, Loader2,
  AlertTriangle, CheckCircle2, Clock, Plus, Layers
} from 'lucide-react'
import axios from 'axios'

interface Song {
  id: string
  _id: string
  title: string
  artist: string
  album: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  processingProgress: number
  duration: number
  stems: any[]
  bpm: number
  detectedKey: string
  uploadedAt: string
  fileSize: number
}

const formatDuration = (s: number) => {
  if (!s) return '--:--'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}
const formatSize = (b: number) => {
  if (!b) return ''
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function LibraryPage() {
  const router = useRouter()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSongs = async () => {
    try {
      const res = await axios.get('/api/songs')
      setSongs(res.data.songs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSongs()
    const interval = setInterval(fetchSongs, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this song and all its stems?')) return
    setDeleting(id)
    try {
      await axios.delete(`/api/songs?id=${id}`)
      setSongs(prev => prev.filter(s => s.id !== id && s._id !== id))
    } catch (e) {
      alert('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const getSongId = (s: Song) => s.id || s._id

  const statusConfig = {
    completed: { icon: CheckCircle2, color: 'var(--accent-green)', label: 'Ready' },
    processing: { icon: Loader2, color: 'var(--accent-cyan)', label: 'Processing' },
    uploaded: { icon: Clock, color: 'var(--accent-orange)', label: 'Queued' },
    failed: { icon: AlertTriangle, color: '#FF4444', label: 'Failed' },
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
          <ChevronLeft size={16} /> Home
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' }}>
            <AudioWaveform size={12} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">STEMIFY</span>
        </div>
        <Link href="/">
          <button className="btn-primary text-xs py-2 px-4">
            <Plus size={14} /> Upload New
          </button>
        </Link>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Your Library</h1>
            <p className="text-text-secondary text-sm mt-1">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-text-secondary">
            <div className="spinner" />
            <span>Loading library…</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-24 space-y-5">
            <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px dashed rgba(0,212,255,0.2)' }}>
              <Music2 size={36} style={{ color: 'var(--accent-cyan)', opacity: 0.5 }} />
            </div>
            <div>
              <p className="text-text-secondary mb-1">No songs yet</p>
              <p className="text-text-muted text-sm">Upload your first song to get started</p>
            </div>
            <Link href="/">
              <button className="btn-primary">
                <Plus size={16} /> Upload Song
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => {
              const id = getSongId(song)
              const status = statusConfig[song.status] || statusConfig.uploaded
              const StatusIcon = status.icon

              return (
                <div key={id} className="glass-card p-4 flex items-center gap-4 group">
                  {/* Art placeholder */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,47,255,0.15))' }}>
                    <Music2 size={20} style={{ color: 'var(--accent-cyan)', opacity: 0.7 }} />
                    {song.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="spinner" style={{ width: 16, height: 16 }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{song.title}</span>
                      {song.detectedKey && song.detectedKey !== 'Unknown' && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>
                          {song.detectedKey}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-text-secondary truncate">
                        {song.artist || 'Unknown Artist'}
                      </span>
                      <span className="text-xs text-text-muted">{formatDuration(song.duration)}</span>
                      {song.bpm > 0 && (
                        <span className="text-xs text-text-muted">{Math.round(song.bpm)} BPM</span>
                      )}
                      {song.status === 'completed' && song.stems?.length > 0 && (
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Layers size={10} /> {song.stems.length} stems
                        </span>
                      )}
                      <span className="text-xs text-text-muted">{formatDate(song.uploadedAt)}</span>
                      {song.fileSize > 0 && (
                        <span className="text-xs text-text-muted">{formatSize(song.fileSize)}</span>
                      )}
                    </div>
                    {song.status === 'processing' && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${song.processingProgress}%`,
                              background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))'
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-muted flex-shrink-0">{song.processingProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusIcon
                      size={13}
                      style={{ color: status.color }}
                      className={song.status === 'processing' ? 'animate-spin' : ''}
                    />
                    <span className="text-xs" style={{ color: status.color }}>{status.label}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {song.status === 'completed' && (
                      <button
                        onClick={() => router.push(`/player?id=${id}`)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' }}
                        title="Open player"
                      >
                        <Play size={13} className="text-white ml-0.5" />
                      </button>
                    )}
                    {song.status === 'failed' && (
                      <Link href={`/player?id=${id}`}>
                        <button className="btn-ghost text-xs py-1 px-3">View</button>
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(id)}
                      disabled={deleting === id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/15 hover:text-red-400 text-text-muted"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                      title="Delete"
                    >
                      {deleting === id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 px-8 py-4 text-center text-xs text-text-muted">
        Stemify — Local AI Audio Processing
      </footer>
    </div>
  )
}
