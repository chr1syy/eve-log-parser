import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'shared-logs')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { log } = body as { log: { sessionId?: string } }

    if (!log?.sessionId || !/^[0-9a-f-]{36}$/i.test(log.sessionId)) {
      return NextResponse.json({ error: 'Invalid log data' }, { status: 400 })
    }

    ensureDir()
    const filePath = path.join(DATA_DIR, `${log.sessionId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(log), 'utf-8')

    return NextResponse.json({ uuid: log.sessionId })
  } catch {
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })
  }
}
