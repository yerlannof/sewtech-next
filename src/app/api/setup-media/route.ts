import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'

const MEDIA_DIR = '/app/media'
const ARCHIVE_URL =
  'https://github.com/yerlannof/sewtech-next/releases/download/media-v1/sewtech-media.tar.gz'
const SECRET = 'sewtech-setup-2026'

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

    // Download and extract
    execSync(`mkdir -p ${MEDIA_DIR}`, { timeout: 5000 })
    execSync(
      `curl -L -o /tmp/media.tar.gz "${ARCHIVE_URL}" && tar xzf /tmp/media.tar.gz -C /app/ && rm /tmp/media.tar.gz`,
      { timeout: 600000, stdio: 'pipe' },
    )

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
