import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import connectDB from '@/lib/mongodb'
import Song from '@/lib/models/Song'
import { UPLOADS_DIR, ensureDirs } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    ensureDirs()
    await connectDB()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || ''
    const artist = (formData.get('artist') as string) || 'Unknown Artist'
    const album = (formData.get('album') as string) || 'Unknown Album'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase() || '.mp3'
    const fileName = `${uuidv4()}${ext}`
    const filePath = path.join(UPLOADS_DIR, fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    const songTitle = title || path.basename(file.name, ext)

    const song = await Song.create({
      title: songTitle,
      artist,
      album,
      originalFileName: file.name,
      originalFilePath: filePath,
      fileSize: buffer.length,
      mimeType: file.type || 'audio/mpeg',
      status: 'uploaded',
      processingProgress: 0,
    })

    return NextResponse.json({
      success: true,
      song: {
        id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        status: song.status,
      },
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}