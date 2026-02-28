'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Upload } from 'lucide-react'

interface Position {
  id: string
  name: string
  description: string
}

interface Candidate {
  id: string
  position_id: string
  name: string
  student_id: string
  manifesto: string
  photo_url: string
}

export default function BallotSetupPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [positionName, setPositionName] = useState('')
  const [candidates, setCandidates] = useState<Array<{
    name: string
    class: string
    stream: string
    image: File | null
  }>>([])

  useEffect(() => {
    fetchPositions()
  }, [])

  const fetchPositions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/positions')
      if (!res.ok) throw new Error('Failed to fetch positions')
      const data = await res.json()
      setPositions(data)
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCandidate = () => {
    setCandidates([...candidates, { name: '', class: '', stream: '', image: null }])
  }

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index))
  }

  const updateCandidate = (index: number, field: string, value: any) => {
    const updated = [...candidates]
    updated[index] = { ...updated[index], [field]: value }
    setCandidates(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!positionName.trim()) {
      alert('Please enter position name')
      return
    }
    if (candidates.length === 0) {
      alert('Please add at least one candidate')
      return
    }

    try {
      const posRes = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: positionName }),
      })
      
      if (!posRes.ok) {
        const errorData = await posRes.json()
        throw new Error(errorData.error || 'Failed to create position')
      }
      
      const position = await posRes.json()

      for (const candidate of candidates) {
        const candRes = await fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position_id: position.id,
            name: candidate.name,
            student_id: `${candidate.class}-${candidate.stream}`,
            manifesto: `Class: ${candidate.class}, Stream: ${candidate.stream}`,
          }),
        })
        
        if (!candRes.ok) {
          const errorData = await candRes.json()
          throw new Error(errorData.error || 'Failed to create candidate')
        }
      }

      alert('Position and candidates created successfully!')
      setPositionName('')
      setCandidates([])
      fetchPositions()
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create position')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src="/Jinja College badge.png" alt="Jinja College" className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-3xl font-bold">Ballot Setup</h1>
          <p className="text-muted-foreground">Create positions and add candidates</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Position</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="position">Name of Position or Post</Label>
              <Input
                id="position"
                placeholder="e.g., Head Boy, Head Girl, Sports Captain"
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Candidates</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCandidate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              </div>

              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No candidates added yet. Click "Add Candidate" to start.
                </p>
              ) : (
                <div className="space-y-4">
                  {candidates.map((candidate, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Candidate {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCandidate(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid gap-4">
                            <div>
                              <Label>Candidate Name</Label>
                              <Input
                                placeholder="Full name"
                                value={candidate.name}
                                onChange={(e) => updateCandidate(index, 'name', e.target.value)}
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Class</Label>
                                <Input
                                  placeholder="e.g., Form 4"
                                  value={candidate.class}
                                  onChange={(e) => updateCandidate(index, 'class', e.target.value)}
                                  required
                                />
                              </div>
                              <div>
                                <Label>Stream</Label>
                                <Input
                                  placeholder="e.g., A, B, C"
                                  value={candidate.stream}
                                  onChange={(e) => updateCandidate(index, 'stream', e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Image (Optional)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    updateCandidate(index, 'image', e.target.files?.[0] || null)
                                  }
                                />
                                {candidate.image && (
                                  <span className="text-sm text-green-600">✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={candidates.length === 0}>
              Create Position with Candidates
            </Button>
          </form>
        </CardContent>
      </Card>

      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{position.name}</p>
                    {position.description && (
                      <p className="text-sm text-muted-foreground">{position.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
