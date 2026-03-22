'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Play, Pause, SkipBack, Volume2, VolumeX, Download, ChevronLeft,
  AudioWaveform, Music2, Waves, Layers, AlertTriangle, CheckCircle2,
  Info
} from 'lucide-react'
import axios from 'axios'

interface Stem {
  type: string
  label: string
  filePath: string
  fileName: string
  duration: number
  color: string
}

interface Modulation {
  timestamp: number
  fromKey: string
  toKey: string
  confidence: number
}

interface SongData {
  id: string
  title: string
  artist: string
  album: string
  status: string
  progress: number
  stems: Stem[]
  modulations: Modulation[]
  vocalParts: any[]
  detectedKey: string
  bpm: number
  duration: number
  error?: string
}

interface StemState {
  muted: boolean
  volume: number
  solo: boolean
}

const STEM_GROUP_ORDER = ['vocals', 'soprano', 'alto', 'tenor', 'baritone', 'bass', 'drums', 'other']

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function hzToNote(hz: number): string {
  if (!hz || hz <= 0) return '?'
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const semitones = Math.round(12 * Math.log2(hz / 440)) + 57
  const octave = Math.floor(semitones / 12)
  const note = notes[((semitones % 12) + 12) % 12]
  return `${note}${octave}`
}

export default function PlayerClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const songId = searchParams.get('id')

  const [song, setSong] = useState<SongData | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [stemStates, setStemStates] = useState<Record<string, StemState>>({})
  const [masterVolume, setMasterVolume] = useState(1)
  const [activeTab, setActiveTab] = useState<'stems' | 'analysis'>('stems')
  const [loadedStems, setLoadedStems] = useState<Set<string>>(new Set())

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const animFrameRef = useRef<number>(0)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Poll for processing status
  useEffect(() => {
    if (!songId) return
    let attempts = 0

    const poll = async () => {
      try {
        const res = await axios.get(`/api/songs/status?id=${songId}`)
        const data = res.data
        setSong(prev => ({
          id: songId,
          title: prev?.title || 'Loading…',
          artist: prev?.artist || '',
          album: prev?.album || '',
          ...data,
          status: data.status,
          progress: data.progress || 0,
        }))

        if (data.status === 'completed') {
          clearInterval(pollingRef.current!)
          setLoading(false)
          const full = await axios.get(`/api/songs?id=${songId}`)
          setSong(full.data.song)
          initStemStates(full.data.song.stems)
        } else if (data.status === 'failed') {
          clearInterval(pollingRef.current!)
          setLoading(false)
        } else {
          attempts++
          if (attempts > 300) clearInterval(pollingRef.current!)
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }

    poll()
    pollingRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollingRef.current!)
  }, [songId])

  const initStemStates = (stems: Stem[]) => {
    const states: Record<string, StemState> = {}
    stems.forEach(s => {
      states[s.type] = { muted: false, volume: 1, solo: false }
    })
    setStemStates(states)
  }

  // Setup audio elements when stems are loaded
  useEffect(() => {
    if (!song?.stems?.length) return

    song.stems.forEach(stem => {
      if (audioRefs.current[stem.type]) return
      const audio = new Audio()
      audio.src = `/api/stream?path=${encodeURIComponent(stem.filePath)}`
      audio.preload = 'metadata'
      audio.volume = 1

      audio.addEventListener('canplaythrough', () => {
        setLoadedStems(prev => new Set([...prev, stem.type]))
        if (!duration && audio.duration) setDuration(audio.duration)
      })
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration || song.duration || 0)
      })

      audioRefs.current[stem.type] = audio
    })

    return () => {
      Object.values(audioRefs.current).forEach(a => {
        a.pause()
        a.src = ''
      })
      audioRefs.current = {}
    }
  }, [song?.stems])

  // Sync volumes
  useEffect(() => {
    if (!song?.stems) return
    const hasSolo = Object.values(stemStates).some(s => s.solo)

    song.stems.forEach(stem => {
      const audio = audioRefs.current[stem.type]
      if (!audio) return
      const state = stemStates[stem.type]
      if (!state) return

      let vol = state.volume * masterVolume
      if (state.muted) vol = 0
      if (hasSolo && !state.solo) vol = 0
      audio.volume = Math.max(0, Math.min(1, vol))
    })
  }, [stemStates, masterVolume, song?.stems])

  // Time update loop
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(animFrameRef.current)
      return
    }
    const tick = () => {
      const audios = Object.values(audioRefs.current)
      if (audios[0]) setCurrentTime(audios[0].currentTime)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [playing])

  const syncAllTo = useCallback((time: number) => {
    Object.values(audioRefs.current).forEach(a => { a.currentTime = time })
  }, [])

  const handlePlayPause = useCallback(async () => {
    const audios = Object.values(audioRefs.current)
    if (!audios.length) return

    if (playing) {
      audios.forEach(a => a.pause())
      setPlaying(false)
    } else {
      try {
        await Promise.all(audios.map(a => a.play()))
        setPlaying(true)
      } catch (e) {
        console.error('Playback error:', e)
      }
    }
  }, [playing])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const time = pct * (duration || song?.duration || 0)
    syncAllTo(time)
    setCurrentTime(time)
  }, [duration, song?.duration, syncAllTo])

  const handleRestart = useCallback(() => {
    syncAllTo(0)
    setCurrentTime(0)
  }, [syncAllTo])

  const toggleMute = (type: string) => {
    setStemStates(prev => ({
      ...prev,
      [type]: { ...prev[type], muted: !prev[type]?.muted }
    }))
  }

  const toggleSolo = (type: string) => {
    setStemStates(prev => {
      const alreadySolo = prev[type]?.solo
      const next: Record<string, StemState> = {}
      Object.keys(prev).forEach(k => {
        next[k] = { ...prev[k], solo: k === type ? !alreadySolo : false }
      })
      return next
    })
  }

  const setStemVolume = (type: string, vol: number) => {
    setStemStates(prev => ({ ...prev, [type]: { ...prev[type], volume: vol } }))
  }

  const handleDownloadStem = (stem: Stem) => {
    const a = document.createElement('a')
    a.href = `/api/stems/download?path=${encodeURIComponent(stem.filePath)}&name=${encodeURIComponent((song?.title ?? 'stem') + '_' + stem.label + '.wav')}`
    a.download = `${song?.title ?? 'stem'}_${stem.label}.wav`
    a.click()
  }

  const dur = duration || song?.duration || 0
  const pct = dur > 0 ? (currentTime / dur) * 100 : 0

  // Loading / processing state
  if (loading || (song && song.status !== 'completed' && song.status !== 'failed')) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar song={song} />
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          <div className="glass-card p-10 max-w-md w-full text-center space-y-6">
            {song?.status === 'failed' ? (
              <>
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-red-500/10">
                  <AlertTriangle size={28} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">Processing Failed</h2>
                  <p className="text-text-secondary text-sm">{song.error || 'An error occurred during stem separation.'}</p>
                </div>
                <Link href="/"><button className="btn-primary w-full">Try Another Song</button></Link>
              </>
            ) : (
              <>
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
                  <div className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,212,255,0.1)' }}>
                    <Layers size={32} style={{ color: 'var(--accent-cyan)' }} />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">Separating Stems…</h2>
                  <p className="text-text-secondary text-sm mb-4">
                    {song?.status === 'processing'
                      ? 'AI is analyzing your track and separating stems'
                      : 'Preparing audio file…'}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-2">
                    <span>Progress</span>
                    <span>{song?.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${song?.progress || 0}%`,
                        background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))'
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  This takes 1–5 minutes depending on song length and your hardware
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!song) return null

  const orderedStems = [...(song.stems || [])].sort(
    (a, b) => STEM_GROUP_ORDER.indexOf(a.type) - STEM_GROUP_ORDER.indexOf(b.type)
  )

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar song={song} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Song Info */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,47,255,0.2))', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Music2 size={28} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>{song.title}</h1>
            <p className="text-text-secondary text-sm">{song.artist}{song.album && ` · ${song.album}`}</p>
            <div className="flex gap-3 mt-1 flex-wrap">
              {song.detectedKey && song.detectedKey !== 'Unknown' && (
                <span className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>
                  Key: {song.detectedKey}
                </span>
              )}
              {song.bpm > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: 'rgba(123,47,255,0.1)', color: 'var(--accent-purple)' }}>
                  {Math.round(song.bpm)} BPM
                </span>
              )}
              <span className="text-xs font-mono px-2 py-0.5 rounded text-text-muted"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                {orderedStems.length} stems
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
            <span className="text-xs text-text-muted">Processed</span>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="glass-card p-5 space-y-4">
          <div className="progress-bar cursor-pointer" onClick={handleSeek}>
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                color: 'var(--accent-cyan)'
              }}
            />
          </div>

          {/* Modulation markers */}
          {song.modulations && song.modulations.length > 0 && (
            <div className="relative h-4">
              {song.modulations.map((mod, i) => {
                const pos = dur > 0 ? (mod.timestamp / dur) * 100 : 0
                return (
                  <div
                    key={i}
                    className="absolute top-0 flex flex-col items-center group cursor-pointer"
                    style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                    title={`${mod.fromKey} → ${mod.toKey} at ${formatTime(mod.timestamp)}`}
                  >
                    <div className="w-1 h-3 rounded-full" style={{ background: 'var(--accent-orange)' }} />
                    <div className="absolute -top-7 hidden group-hover:block z-10">
                      <div className="modulation-badge whitespace-nowrap text-xs">
                        {mod.fromKey} → {mod.toKey}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Playback buttons */}
          <div className="flex items-center gap-4">
            <button onClick={handleRestart} className="text-text-secondary hover:text-text-primary transition-colors">
              <SkipBack size={18} />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' }}
            >
              {playing ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
            </button>

            <div className="text-sm font-mono text-text-secondary">
              {formatTime(currentTime)} / {formatTime(dur)}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Volume2 size={15} className="text-text-muted flex-shrink-0" />
              <input
                type="range" min="0" max="1" step="0.01"
                value={masterVolume}
                onChange={e => setMasterVolume(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-text-muted w-8 text-right">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5">
          {(['stems', 'analysis'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-cyan-400 text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
              style={activeTab === tab ? { borderColor: 'var(--accent-cyan)' } : {}}
            >
              {tab === 'stems' ? `Stems (${orderedStems.length})` : 'Analysis'}
            </button>
          ))}
        </div>

        {activeTab === 'stems' && (
          <div className="space-y-3">
            {orderedStems.some(s => ['vocals', 'soprano', 'alto', 'tenor', 'baritone'].includes(s.type)) && (
              <div className="text-xs text-text-muted uppercase tracking-widest font-mono mb-1 flex items-center gap-2">
                <Waves size={12} /> Vocal Stems
              </div>
            )}
            {orderedStems.filter(s => ['vocals', 'soprano', 'alto', 'tenor', 'baritone'].includes(s.type)).map(stem => (
              <StemTrack
                key={stem.type} stem={stem}
                state={stemStates[stem.type] || { muted: false, volume: 1, solo: false }}
                playing={playing}
                onMute={() => toggleMute(stem.type)}
                onSolo={() => toggleSolo(stem.type)}
                onVolume={(v) => setStemVolume(stem.type, v)}
                onDownload={() => handleDownloadStem(stem)}
                loaded={loadedStems.has(stem.type)}
              />
            ))}

            {orderedStems.some(s => ['bass', 'drums', 'other'].includes(s.type)) && (
              <div className="text-xs text-text-muted uppercase tracking-widest font-mono mb-1 mt-4 flex items-center gap-2">
                <Layers size={12} /> Instrumental Stems
              </div>
            )}
            {orderedStems.filter(s => ['bass', 'drums', 'other'].includes(s.type)).map(stem => (
              <StemTrack
                key={stem.type} stem={stem}
                state={stemStates[stem.type] || { muted: false, volume: 1, solo: false }}
                playing={playing}
                onMute={() => toggleMute(stem.type)}
                onSolo={() => toggleSolo(stem.type)}
                onVolume={(v) => setStemVolume(stem.type, v)}
                onDownload={() => handleDownloadStem(stem)}
                loaded={loadedStems.has(stem.type)}
              />
            ))}
          </div>
        )}

        {activeTab === 'analysis' && (
          <AnalysisPanel song={song} onSeek={(t) => { syncAllTo(t); setCurrentTime(t) }} />
        )}
      </main>
    </div>
  )
}

function TopBar({ song }: { song: SongData | null }) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
      <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
        <ChevronLeft size={16} /> Back
      </Link>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' }}>
          <AudioWaveform size={12} className="text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight">STEMIFY</span>
      </div>
      <Link href="/library">
        <button className="btn-ghost text-xs py-1.5 px-3">Library</button>
      </Link>
    </nav>
  )
}

function StemTrack({ stem, state, playing, onMute, onSolo, onVolume, onDownload, loaded }: {
  stem: Stem; state: StemState; playing: boolean
  onMute: () => void; onSolo: () => void; onVolume: (v: number) => void
  onDownload: () => void; loaded: boolean
}) {
  const isActive = playing && !state.muted

  return (
    <div
      className={`stem-track ${state.muted ? 'muted' : ''}`}
      style={{ borderLeftColor: state.muted ? 'transparent' : stem.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-0.5 w-8 h-6 flex-shrink-0">
          {isActive ? (
            [28,45,35,55,40,30,50,35].map((h, i) => (
              <div
                key={i} className="wave-bar flex-1"
                style={{
                  background: stem.color,
                  height: `${h}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationPlayState: 'running'
                }}
              />
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-0.5 rounded" style={{ background: state.muted ? '#333' : stem.color, opacity: 0.5 }} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-shrink-0 w-24">
          <div className="text-sm font-semibold text-text-primary">{stem.label}</div>
          <div className="text-xs text-text-muted capitalize">{stem.type}</div>
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            type="range" min="0" max="1" step="0.01"
            value={state.volume}
            onChange={e => onVolume(parseFloat(e.target.value))}
            style={{ accentColor: stem.color }}
            className="flex-1"
          />
          <span className="text-xs text-text-muted w-8 text-right font-mono">
            {Math.round(state.volume * 100)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onSolo}
            className="w-7 h-7 rounded text-xs font-bold transition-all flex items-center justify-center"
            style={{
              background: state.solo ? stem.color : 'rgba(255,255,255,0.06)',
              color: state.solo ? 'white' : 'var(--text-secondary)',
            }}
            title="Solo"
          >S</button>

          <button
            onClick={onMute}
            className="w-7 h-7 rounded transition-all flex items-center justify-center"
            style={{
              background: state.muted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
              color: state.muted ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
            title={state.muted ? 'Unmute' : 'Mute'}
          >
            {state.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>

          <button
            onClick={onDownload}
            className="w-7 h-7 rounded transition-all flex items-center justify-center hover:text-cyan-400"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
            title="Download stem"
          >
            <Download size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalysisPanel({ song, onSeek }: { song: SongData; onSeek: (t: number) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="text-xs text-text-muted uppercase tracking-widest mb-2">Detected Key</div>
          <div className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)' }}>
            {song.detectedKey || 'N/A'}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-text-muted uppercase tracking-widest mb-2">Tempo</div>
          <div className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-purple)' }}>
            {song.bpm > 0 ? `${Math.round(song.bpm)} BPM` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span style={{ color: 'var(--accent-orange)' }}>⬡</span> Key Modulations
          </h3>
          <span className="text-xs text-text-muted">{song.modulations?.length || 0} detected</span>
        </div>
        {song.modulations && song.modulations.length > 0 ? (
          <div className="space-y-2">
            {song.modulations.map((mod, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                style={{ background: 'rgba(255,107,47,0.06)', border: '1px solid rgba(255,107,47,0.15)' }}
                onClick={() => onSeek(mod.timestamp)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted">{formatTime(mod.timestamp)}</span>
                  <span className="modulation-badge">{mod.fromKey} → {mod.toKey}</span>
                </div>
                <span className="text-xs text-text-muted">{Math.round(mod.confidence * 100)}% conf.</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4 flex items-center justify-center gap-2">
            <Info size={14} /> No modulations detected in this track
          </p>
        )}
      </div>

      {song.vocalParts && song.vocalParts.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Waves size={14} style={{ color: 'var(--accent-pink)' }} /> Vocal Range Analysis
          </h3>
          <div className="space-y-3">
            {song.vocalParts.map((part: any) => {
              const colors: Record<string, string> = {
                soprano: '#FF8FAB', alto: '#C77DFF', tenor: '#4CC9F0', baritone: '#F77F00'
              }
              const color = colors[part.type] || '#00D4FF'
              return (
                <div key={part.type} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium capitalize" style={{ color }}>{part.type}</div>
                  <div className="flex-1 h-2 rounded-full bg-white/5 relative overflow-hidden">
                    <div className="h-full rounded-full" style={{ background: color, opacity: 0.7, width: '100%' }} />
                  </div>
                  <div className="text-xs font-mono text-text-muted w-28 text-right">
                    {hzToNote(part.rangeMin)} – {hzToNote(part.rangeMax)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}