import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Use /api/voting/submit instead.' },
    { status: 410 }
  )
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Use /api/results or /api/voting/* endpoints.' },
    { status: 410 }
  )
}
