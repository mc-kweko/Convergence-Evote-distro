'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

interface Student {
  id: string
  student_id: string
  name: string
  email: string
  class: string
  has_voted: boolean
}

export default function VotingPortalPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students')
      if (!res.ok) throw new Error('Failed to fetch students')
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !pin) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/voting/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          pin: pin,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid PIN')
        return
      }

      router.push('/vote')
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/Jinja College badge.png" alt="Jinja College" className="w-20 h-20 object-contain" />
            </div>
            <CardTitle className="text-3xl">Student Voting Portal</CardTitle>
            <p className="text-muted-foreground">Jinja College Electoral Commission</p>
          </CardHeader>

        <CardContent className="space-y-6">
          {!selectedStudent ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search Your Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Type your name or student ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {search && (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No students found</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className="w-full text-left p-4 hover:bg-muted border-b last:border-b-0 transition-colors"
                        disabled={student.has_voted}
                      >
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.student_id || '-'}
                          {student.class && ` • ${student.class}`}
                        </p>
                        {student.has_voted && (
                          <span className="text-xs text-green-600 font-medium">✓ Already Voted</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Selected Student</p>
                <p className="font-bold text-lg">{selectedStudent.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent.student_id || '-'}
                  {selectedStudent.class && ` • ${selectedStudent.class}`}
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null)
                    setPin('')
                    setError('')
                  }}
                  className="mt-2 p-0 h-auto"
                >
                  Change Student
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Enter Your PIN</label>
                <Input
                  type="password"
                  placeholder="Enter 8-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={8}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the PIN from your voting card
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Logging in...' : 'Login to Vote'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Footer Branding */}
      <div className="text-center text-sm text-slate-400 mt-6 space-y-1">
        <p>Built by Jinja College ICT Club</p>
        <p>© {new Date().getFullYear()} Jinja College. All rights reserved.</p>
      </div>
      </div>
    </div>
  )
}
