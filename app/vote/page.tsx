'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

interface Candidate {
  id: string
  name: string
  student_id: string
  manifesto: string
  photo_url: string
}

interface Position {
  id: string
  name: string
  candidates: Candidate[]
}

export default function VotePage() {
  const router = useRouter()
  const [positions, setPositions] = useState<Position[]>([])
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchBallot()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/voting/me')
      if (!res.ok) {
        router.push('/voting')
      }
    } catch (error) {
      router.push('/voting')
    }
  }

  const fetchBallot = async () => {
    try {
      const res = await fetch('/api/voting/ballot')
      if (!res.ok) throw new Error('Failed to fetch ballot')
      const data = await res.json()
      setPositions(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = (positionId: string, candidateId: string) => {
    setVotes({ ...votes, [positionId]: candidateId })
  }

  const handleSubmit = async () => {
    if (Object.keys(votes).length === 0) {
      alert('Please select at least one candidate')
      return
    }

    if (!confirm('Are you sure you want to submit your votes? This action cannot be undone.')) {
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/voting/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes }),
      })

      if (!res.ok) throw new Error('Failed to submit votes')

      alert('Your votes have been submitted successfully!')
      router.push('/voting/success')
    } catch (error) {
      alert('Failed to submit votes. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading ballot...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/Jinja College badge.png" alt="Jinja College" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold">Official Ballot</h1>
          <p className="text-muted-foreground">Jinja College Electoral Commission</p>
          <p className="text-sm text-muted-foreground">Select one candidate for each position</p>
        </div>

        {positions.map((position) => (
          <Card key={position.id}>
            <CardHeader>
              <CardTitle className="text-2xl">{position.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {position.candidates.map((candidate) => {
                const isSelected = votes[position.id] === candidate.id

                return (
                  <button
                    key={candidate.id}
                    onClick={() => handleVote(position.id, candidate.id)}
                    className={`w-full p-4 border-2 rounded-lg transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {candidate.photo_url ? (
                          <img
                            src={candidate.photo_url}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                            {candidate.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.manifesto}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>
        ))}

        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-semibold">Votes Selected</p>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(votes).length} of {positions.length} positions
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              size="lg"
              className="w-full"
              disabled={submitting || Object.keys(votes).length === 0}
            >
              {submitting ? 'Submitting...' : 'Confirm and Submit'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
