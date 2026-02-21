import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'shared-logs')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params

  // Strict UUID validation to prevent path traversal
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })
  }

  const filePath = path.join(DATA_DIR, `${uuid}.json`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return new NextResponse(data, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to read log' }, { status: 500 })
  }
}
