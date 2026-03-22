'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Candidate {
  id: string
  name: string
  vote_count: number
}

interface Position {
  id: string
  title: string
  candidates: Candidate[]
}

export default function ResultsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [schoolId, setSchoolId] = useState<string>('')

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        if (data?.user?.school_id) {
          setSchoolId(data.user.school_id)
        }
      } catch (error) {
        console.error('Failed to resolve school scope:', error)
      }
    }
    bootstrap()
  }, [])

  useEffect(() => {
    if (!schoolId) return
    fetchResults()
    const interval = setInterval(fetchResults, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [schoolId])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/results?school_id=${encodeURIComponent(schoolId)}`)
      if (!res.ok) throw new Error('Failed to fetch results')
      const data = await res.json()

      // Group by position
      const groupedByPosition: { [key: string]: Position } = {}
      for (const candidate of data) {
        const posId = candidate.position?.id
        const posName = candidate.position?.name
        if (!posId) continue
        
        if (!groupedByPosition[posId]) {
          groupedByPosition[posId] = {
            id: posId,
            title: posName || 'Unknown Position',
            candidates: [],
          }
        }
        groupedByPosition[posId].candidates.push({
          id: candidate.id,
          name: candidate.name,
          vote_count: candidate.vote_count || 0,
        })
      }

      setPositions(Object.values(groupedByPosition))
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const res = await fetch('/api/export/results')
      if (!res.ok) throw new Error('Failed to export results')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'election_results.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting results:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading && positions.length === 0) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src="/Convergence%20Logo-distro.png" alt="Convergence E-Vote" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold">Live Results</h1>
            <p className="text-muted-foreground">Convergence E-Vote</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchResults} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {positions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No results available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {positions.map((position) => {
            const totalVotes = position.candidates.reduce((sum, c) => sum + c.vote_count, 0)
            const chartData = position.candidates.map((c) => ({
              name: c.name,
              votes: c.vote_count,
            }))

            return (
              <Card key={position.id}>
                <CardHeader>
                  <CardTitle>{position.title}</CardTitle>
                  <CardDescription>Total votes: {totalVotes}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="votes" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {position.candidates
                      .sort((a, b) => b.vote_count - a.vote_count)
                      .map((candidate, index) => (
                        <Card key={candidate.id} className="bg-muted">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                #{index + 1} {candidate.name}
                              </p>
                              <p className="text-3xl font-bold">{candidate.vote_count}</p>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{
                                    width: `${totalVotes > 0 ? (candidate.vote_count / totalVotes) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {totalVotes > 0
                                  ? ((candidate.vote_count / totalVotes) * 100).toFixed(1)
                                  : 0}
                                %
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}


