import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('path')
    const fileName = searchParams.get('name') || 'stem.wav'

    if (!filePath) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }

    const uploadsBase = path.join(process.cwd(), 'uploads')
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(uploadsBase)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = fs.readFileSync(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'audio/wav',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
