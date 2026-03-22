import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }

    // Security: only allow files within the uploads directory
    const uploadsBase = path.join(process.cwd(), 'uploads')
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(uploadsBase)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const stat = fs.statSync(resolvedPath)
    const fileSize = stat.size
    const range = req.headers.get('range')
    const ext = path.extname(resolvedPath).toLowerCase()

    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
    }
    const contentType = mimeTypes[ext] || 'audio/mpeg'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const fileStream = fs.createReadStream(resolvedPath, { start, end })
      const chunks: Uint8Array[] = []

      await new Promise<void>((resolve, reject) => {
        fileStream.on('data', (chunk) => chunks.push(chunk as Uint8Array))
        fileStream.on('end', resolve)
        fileStream.on('error', reject)
      })

      return new NextResponse(Buffer.concat(chunks), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
        },
      })
    }

    const buffer = fs.readFileSync(resolvedPath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
