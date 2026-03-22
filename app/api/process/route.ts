import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import connectDB from '@/lib/mongodb'
import Song from '@/lib/models/Song'
import { getSongStemsDir, STEM_COLORS } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { songId } = await req.json()

    if (!songId) {
      return NextResponse.json({ error: 'Song ID required' }, { status: 400 })
    }

    const song = await Song.findById(songId)
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    if (song.status === 'processing') {
      return NextResponse.json({ message: 'Already processing' })
    }

    song.status = 'processing'
    song.processingProgress = 0
    await song.save()

    // Run processing asynchronously
    processSong(songId, song.originalFilePath).catch(console.error)

    return NextResponse.json({ success: true, message: 'Processing started' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function processSong(songId: string, filePath: string) {
  const pythonScript = path.join(process.cwd(), 'python-service', 'process.py')
  const stemsDir = getSongStemsDir(songId)

  return new Promise<void>((resolve, reject) => {
    const python = spawn('python3', [pythonScript, filePath, stemsDir, songId], {
      env: { ...process.env },
    })

    let outputData = ''
    let errorData = ''

    python.stdout.on('data', async (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line)
          if (msg.type === 'progress') {
            await Song.findByIdAndUpdate(songId, { processingProgress: msg.value })
          } else if (msg.type === 'result') {
            outputData = line
          }
        } catch {}
      }
    })

    python.stderr.on('data', (data: Buffer) => {
      errorData += data.toString()
      console.error('Python stderr:', data.toString())
    })

    python.on('close', async (code) => {
      try {
        await connectDB()
        if (code !== 0) {
          await Song.findByIdAndUpdate(songId, {
            status: 'failed',
            errorMessage: errorData || 'Processing failed',
          })
          return reject(new Error(errorData))
        }

        if (outputData) {
          const result = JSON.parse(outputData)
          const stems = (result.stems || []).map((s: any) => ({
            type: s.type,
            label: s.label,
            filePath: s.filePath,
            fileName: s.fileName,
            duration: s.duration || 0,
            color: STEM_COLORS[s.type] || '#00D4FF',
          }))

          await Song.findByIdAndUpdate(songId, {
            status: 'completed',
            processingProgress: 100,
            processedAt: new Date(),
            stems,
            modulations: result.modulations || [],
            vocalParts: result.vocalParts || [],
            detectedKey: result.detectedKey || 'Unknown',
            bpm: result.bpm || 0,
            duration: result.duration || 0,
          })
        }
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
}
