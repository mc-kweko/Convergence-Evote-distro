import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('voter_session')
  response.cookies.delete('voter_school_id')
  response.cookies.delete('voter_school_slug')
  return response
}