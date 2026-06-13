'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ShieldCheck, LogOut } from 'lucide-react'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const voteRef = searchParams.get('ref') || ''
  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    // Ensure voter session is cleared
    fetch('/api/voting/logout', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(t)
          router.replace('/voting')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a2818 0%, #0d3d24 50%, #1a5c38 100%)' }}>
      <div className="w-full max-w-md space-y-4">

        <Card className="border-0 shadow-2xl text-center">
          <CardContent className="pt-10 pb-8 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900">Vote Submitted!</h1>
              <p className="text-slate-500">
                Thank you for participating. Your vote has been securely recorded.
              </p>
            </div>

            {/* Receipt */}
            {voteRef && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Your Vote Reference</p>
                <p className="font-mono text-lg font-bold text-slate-800 tracking-widest">{voteRef.toUpperCase()}</p>
                <p className="text-xs text-slate-400">Keep this reference. It proves your vote was recorded without revealing your choice.</p>
              </div>
            )}

            {/* Security notice */}
            <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800">
                Your vote is anonymous and cannot be changed. Results will be announced after the election closes.
              </p>
            </div>

            {/* Logout notice */}
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
              <LogOut className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">
                You have been logged out for security. Returning to the portal in {countdown}s.
              </p>
            </div>

            <Button onClick={() => router.replace('/voting')} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
              Return to Portal Now
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-green-200/60 text-xs">
          © {new Date().getFullYear()} Omicron School Vote. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function VotingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
