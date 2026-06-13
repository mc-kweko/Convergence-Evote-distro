'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { CheckCircle2, Clock, ShieldCheck, AlertCircle, Loader2, User } from 'lucide-react'

interface Candidate {
  id: string
  name: string
  student_id: string
  manifesto: string
  photo_url: string | null
}

interface Position {
  id: string
  name: string
  description: string | null
  candidates: Candidate[]
}

export default function BallotPage() {
  const router = useRouter()
  const [positions, setPositions] = useState<Position[]>([])
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [votingEnded, setVotingEnded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Auth check + ballot load
  useEffect(() => {
    const init = async () => {
      // Auth check
      const authRes = await fetch('/api/voting/me')
      if (!authRes.ok) { router.replace('/voting'); return }

      // Fetch ballot
      const ballotRes = await fetch('/api/voting/ballot')
      if (!ballotRes.ok) {
        const err = await ballotRes.json()
        setError(err.error || 'Failed to load ballot.')
        router.replace('/voting')
        return
      }
      const data: Position[] = await ballotRes.json()
      setPositions(data)
      setLoading(false)
    }
    init()
  }, [router])

  // Poll election status every 5s
  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/election', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    setTimeRemaining(data.time_remaining ?? 0)
    if (!data.is_active || (data.time_remaining ?? 0) <= 0) {
      setVotingEnded(true)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Local countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (timeRemaining > 0 && !votingEnded) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setVotingEnded(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timeRemaining, votingEnded])

  // Auto-logout when voting ends
  useEffect(() => {
    if (!votingEnded) return
    fetch('/api/voting/logout', { method: 'POST' }).finally(() => {
      setTimeout(() => router.replace('/voting'), 3000)
    })
  }, [votingEnded, router])

  const handleVote = (positionId: string, candidateId: string) => {
    setVotes(prev => ({ ...prev, [positionId]: candidateId }))
  }

  const allVoted = positions.length > 0 && Object.keys(votes).length === positions.length

  const handleSubmit = async () => {
    setConfirmOpen(false)
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/voting/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to submit votes.'); return }
      router.push(`/voting/success?ref=${data.voteHash?.slice(0, 12) ?? ''}`)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 60%, #1a3a6b 100%)' }}>
        <div className="text-center text-white space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-400" />
          <p className="text-slate-300">Loading your ballot...</p>
        </div>
      </div>
    )
  }

  if (votingEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 60%, #1a3a6b 100%)' }}>
        <Card className="w-full max-w-md text-center border-0 shadow-2xl">
          <CardContent className="pt-10 pb-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Voting Period Ended</h2>
            <p className="text-slate-500 text-sm">The election has closed. You are being logged out.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-none">Omicron School Vote</p>
              <p className="text-xs text-slate-400">Official Ballot</p>
            </div>
          </div>
          {timeRemaining > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold
              ${timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Cast Your Vote</h1>
          <p className="text-slate-500 mt-1">Select one candidate for each position below</p>
        </div>

        {error && (
          <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Positions */}
        {positions.map((position, posIdx) => (
          <Card key={position.id} className={`transition-all duration-200 ${votes[position.id] ? 'ring-2 ring-emerald-400' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-slate-900">{position.name}</CardTitle>
                  {position.description && <p className="text-sm text-slate-500 mt-0.5">{position.description}</p>}
                </div>
                {votes[position.id]
                  ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Selected</span>
                  : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Choose one</span>
                }
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {position.candidates.map(candidate => {
                const isSelected = votes[position.id] === candidate.id
                return (
                  <button
                    key={candidate.id}
                    onClick={() => handleVote(position.id, candidate.id)}
                    aria-pressed={isSelected}
                    aria-label={`Vote for ${candidate.name}`}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                      ${isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50 bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-white shadow">
                        {candidate.photo_url ? (
                          <img src={candidate.photo_url} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-slate-100">
                            <User className="w-7 h-7 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-lg truncate">{candidate.name}</p>
                        {candidate.manifesto && (
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{candidate.manifesto}</p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        ))}

        {/* Submit bar */}
        <div className="sticky bottom-4">
          <Card className="shadow-xl border-0 bg-white">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {Object.keys(votes).length} of {positions.length} positions selected
                  </p>
                  {!allVoted && (
                    <p className="text-xs text-slate-400">Select a candidate for every position to continue</p>
                  )}
                </div>
                {allVoted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <Button
                className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                disabled={!allVoted || submitting || votingEnded}
                onClick={() => setConfirmOpen(true)}
              >
                {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Submitting...</> : 'Submit My Votes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Your Vote</DialogTitle>
            <DialogDescription>
              You are about to submit your votes. <strong>This action cannot be undone.</strong> You can only vote once.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
            {positions.map(pos => {
              const cand = pos.candidates.find(c => c.id === votes[pos.id])
              return cand ? (
                <div key={pos.id} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span className="text-slate-500 text-xs">{pos.name}</span>
                  <span className="font-semibold text-slate-900 text-xs">{cand.name}</span>
                </div>
              ) : null
            })}
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">Go Back</Button>
            <Button onClick={handleSubmit} disabled={submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Yes, Submit Votes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
