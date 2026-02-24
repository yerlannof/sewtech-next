import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { existsSync, readdirSync, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const MEDIA_DIR = '/app/media'
const ARCHIVE_URL =
  'https://github.com/yerlannof/sewtech-next/releases/download/media-v1/sewtech-media.tar.gz'
const SECRET = 'sewtech-setup-2026'

export const maxDuration = 300 // 5 min timeout

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('key') !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    // Check if media already exists
    if (existsSync(MEDIA_DIR)) {
      const files = readdirSync(MEDIA_DIR)
      if (files.length > 100) {
        return NextResponse.json({
          status: 'already_setup',
          files: files.length,
          message: 'Media directory already has files',
        })
      }
    }

    execSync(`mkdir -p ${MEDIA_DIR}`, { timeout: 5000 })

    // Download using Node.js fetch (follows redirects)
    const response = await fetch(ARCHIVE_URL, { redirect: 'follow' })
    if (!response.ok || !response.body) {
      return NextResponse.json(
        { status: 'error', message: `Download failed: ${response.status}` },
        { status: 500 },
      )
    }

    // Save to temp file
    const tmpPath = '/tmp/media.tar.gz'
    const fileStream = createWriteStream(tmpPath)
    await pipeline(Readable.fromWeb(response.body as never), fileStream)

    // Extract
    execSync(`tar xzf ${tmpPath} -C /app/ && rm ${tmpPath}`, {
      timeout: 300000,
      stdio: 'pipe',
    })

    const files = readdirSync(MEDIA_DIR)
    return NextResponse.json({
      status: 'success',
      files: files.length,
      message: `Downloaded and extracted ${files.length} media files`,
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 },
    )
  }
}
