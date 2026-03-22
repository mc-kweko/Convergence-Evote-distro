'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Upload, Eye, Edit, X, Power } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface Position {
  id: string
  name: string
  description: string
  is_active: boolean
}

interface Candidate {
  id: string
  position_id: string
  name: string
  student_id: string
  manifesto: string
  photo_url: string | null
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
    imagePreview: string | null
  }>>([])
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [positionCandidates, setPositionCandidates] = useState<Candidate[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [editForm, setEditForm] = useState({ name: '', student_id: '', manifesto: '' })

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

  const fetchCandidates = async (positionId: string) => {
    try {
      const res = await fetch(`/api/candidates?position_id=${positionId}`)
      if (!res.ok) throw new Error('Failed to fetch candidates')
      const data = await res.json()
      console.log('Fetched candidates:', data)
      setPositionCandidates(data)
    } catch (error) {
      console.error('Error fetching candidates:', error)
    }
  }

  const handleViewPosition = async (position: Position) => {
    setSelectedPosition(position)
    await fetchCandidates(position.id)
    setShowPreview(true)
  }

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to delete this position? All candidates will also be deleted.')) return
    
    try {
      const res = await fetch(`/api/positions/${positionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete position')
      alert('Position deleted successfully')
      fetchPositions()
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Failed to delete position')
    }
  }

  const handleTogglePosition = async (positionId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to toggle position')
      fetchPositions()
    } catch (error) {
      console.error('Error toggling position:', error)
      alert('Failed to toggle position')
    }
  }

  const handleEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    setEditForm({
      name: candidate.name,
      student_id: candidate.student_id,
      manifesto: candidate.manifesto || ''
    })
  }

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return
    
    try {
      const res = await fetch(`/api/candidates/${editingCandidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) throw new Error('Failed to update candidate')
      alert('Candidate updated successfully')
      setEditingCandidate(null)
      if (selectedPosition) await fetchCandidates(selectedPosition.id)
    } catch (error) {
      console.error('Error updating candidate:', error)
      alert('Failed to update candidate')
    }
  }

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!candidateId || candidateId === 'undefined') {
      alert('Invalid candidate ID')
      return
    }
    
    if (!confirm('Are you sure you want to delete this candidate?')) return
    
    console.log('Deleting candidate with ID:', candidateId)
    
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      
      const result = await res.json()
      alert('Candidate deleted successfully')
      if (selectedPosition) await fetchCandidates(selectedPosition.id)
    } catch (error) {
      console.error('Error deleting candidate:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete candidate'
      alert(`Failed to delete candidate: ${errorMessage}`)
    }
  }

  const addCandidate = () => {
    setCandidates([...candidates, { name: '', class: '', stream: '', image: null, imagePreview: null }])
  }

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index))
  }

  const updateCandidate = (index: number, field: string, value: any) => {
    const updated = [...candidates]
    if (field === 'image' && value instanceof File) {
      updated[index] = { 
        ...updated[index], 
        image: value,
        imagePreview: URL.createObjectURL(value)
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
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

        const createdCandidate = await candRes.json()

        if (candidate.image) {
          const formData = new FormData()
          formData.append('file', candidate.image)
          formData.append('candidateId', createdCandidate.id)
          
          await fetch('/api/candidates/upload', {
            method: 'POST',
            body: formData,
          })
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
        <img src="/Convergence%20Logo-distro.png" alt="Convergence E-Vote" className="w-16 h-16 object-contain" />
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
                              <Label>Candidate Photo</Label>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="flex-1">
                                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                      {candidate.imagePreview ? (
                                        <img 
                                          src={candidate.imagePreview} 
                                          alt="Preview" 
                                          className="h-full w-full object-cover rounded-lg"
                                        />
                                      ) : (
                                        <div className="text-center">
                                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                          <p className="text-sm text-muted-foreground">Click to upload photo</p>
                                        </div>
                                      )}
                                    </div>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        updateCandidate(index, 'image', e.target.files?.[0] || null)
                                      }
                                    />
                                  </label>
                                </div>
                                {candidate.image && (
                                  <p className="text-xs text-green-600 flex items-center gap-1">
                                    ✓ {candidate.image.name}
                                  </p>
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
            <p className="text-sm text-muted-foreground mt-2">
              Toggle positions to control which ones appear on the ballot
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={position.is_active}
                          onCheckedChange={() => handleTogglePosition(position.id, position.is_active)}
                        />
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          position.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {position.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div onClick={() => handleViewPosition(position)} className="cursor-pointer">
                        <p className="font-medium">{position.name}</p>
                        {position.description && (
                          <p className="text-sm text-muted-foreground">{position.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPosition(position)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePosition(position.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Ballot Preview: {selectedPosition?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Position</p>
              <h3 className="text-xl font-bold">{selectedPosition?.name}</h3>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Candidates ({positionCandidates.length})</h4>
              </div>
              
              {positionCandidates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No candidates added yet</p>
              ) : (
                <div className="grid gap-4">
                  {positionCandidates.map((candidate) => (
                    <Card key={candidate.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          {candidate.photo_url && (
                            <img 
                              src={candidate.photo_url} 
                              alt={candidate.name}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-bold text-lg">{candidate.name}</h5>
                            <p className="text-sm text-muted-foreground">ID: {candidate.student_id}</p>
                            {candidate.manifesto && (
                              <p className="text-sm mt-2">{candidate.manifesto}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCandidate(candidate)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCandidate(candidate.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCandidate} onOpenChange={() => setEditingCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Candidate Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Student ID</Label>
              <Input
                value={editForm.student_id}
                onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Manifesto</Label>
              <Input
                value={editForm.manifesto}
                onChange={(e) => setEditForm({ ...editForm, manifesto: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCandidate(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCandidate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


