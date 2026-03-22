import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Verification is not available on the current schema.' },
    { status: 410 }
  )
}
