import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Song from '@/lib/models/Song'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const song = await Song.findById(id).select('status processingProgress errorMessage stems modulations vocalParts detectedKey bpm duration').lean()
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      id: (song as any)._id?.toString(),
      status: song.status,
      progress: song.processingProgress,
      error: song.errorMessage,
      stems: song.status === 'completed' ? song.stems : [],
      modulations: song.status === 'completed' ? song.modulations : [],
      vocalParts: song.status === 'completed' ? song.vocalParts : [],
      detectedKey: song.detectedKey,
      bpm: song.bpm,
      duration: song.duration,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
