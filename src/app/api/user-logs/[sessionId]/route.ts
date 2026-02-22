import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE_DIR = path.join(process.cwd(), 'data', 'user-logs')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ?? ''

    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const userDir = path.join(BASE_DIR, userId)
    // Prevent path traversal: userDir must be a direct child of BASE_DIR
    if (!userDir.startsWith(BASE_DIR + path.sep)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    const filePath = path.join(userDir, `${sessionId}.json`)
    // Prevent path traversal: filePath must be within userDir
    if (!filePath.startsWith(userDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const log = JSON.parse(raw)

    return NextResponse.json({ log })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 })
  }
}
