import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Song from '@/lib/models/Song'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (id) {
      const song = await Song.findById(id).lean()
      if (!song) {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 })
      }
      return NextResponse.json({ song: serializeSong(song) })
    }

    const skip = (page - 1) * limit
    const [songs, total] = await Promise.all([
      Song.find({}).sort({ uploadedAt: -1 }).skip(skip).limit(limit).lean(),
      Song.countDocuments({}),
    ])

    return NextResponse.json({
      songs: songs.map(serializeSong),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const song = await Song.findByIdAndDelete(id)
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Clean up files
    const fs = await import('fs')
    const path = await import('path')
    try {
      if (fs.existsSync(song.originalFilePath)) fs.unlinkSync(song.originalFilePath)
      const stemsDir = path.join(process.cwd(), 'uploads', 'stems', id)
      if (fs.existsSync(stemsDir)) fs.rmSync(stemsDir, { recursive: true })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function serializeSong(song: any) {
  return {
    ...song,
    _id: song._id?.toString(),
    id: song._id?.toString(),
  }
}
