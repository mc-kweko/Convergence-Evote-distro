'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, Download, Trash2, AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Student {
  id: string
  student_id: string
  name: string
  email: string
  phone?: string
  class?: string
  pin: string
  has_voted: boolean
  created_at: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState('')
  const [importing, setImporting] = useState(false)
  const [generatingCards, setGeneratingCards] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/students')
      if (!res.ok) throw new Error('Failed to fetch students')
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to import students')
      }
      
      const result = await res.json()

      alert(`Successfully imported ${result.count} students`)
      fetchStudents()
    } catch (error) {
      console.error('Error importing students:', error)
      alert(error instanceof Error ? error.message : 'Failed to import students')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleExportTemplate = () => {
    const XLSX = require('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      ['Student ID', 'Student Name', 'Class'],
      ['12345', 'John Doe', 'Form 4A'],
      ['67890', 'Jane Smith', 'Form 4B'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, 'student_import_template.xlsx')
  }

  const handleGenerateVotingCards = async () => {
    try {
      setGeneratingCards(true)
      const res = await fetch('/api/voting-cards/generate', {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to generate voting cards')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'voting_cards.pdf'
      a.click()
      window.URL.revokeObjectURL(url)

      alert('Voting cards generated successfully')
    } catch (error) {
      console.error('Error generating voting cards:', error)
      alert('Failed to generate voting cards')
    } finally {
      setGeneratingCards(false)
    }
  }

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete student')
      alert('Student deleted successfully')
      fetchStudents()
    } catch (error) {
      alert('Failed to delete student')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected students?`)) return

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/students/${id}`, { method: 'DELETE' })
        )
      )
      alert('Students deleted successfully')
      setSelectedIds(new Set())
      fetchStudents()
    } catch (error) {
      alert('Failed to delete students')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL students? This cannot be undone!')) return
    if (!confirm('This will permanently delete all student records. Continue?')) return

    try {
      const res = await fetch('/api/students/clear', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear students')
      alert('All students cleared successfully')
      setSelectedIds(new Set())
      fetchStudents()
    } catch (error) {
      alert('Failed to clear students')
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(searching.toLowerCase()) ||
    s.student_id?.includes(searching) ||
    s.email?.toLowerCase().includes(searching.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src="/Jinja College badge.png" alt="Jinja College" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold">Student Management</h1>
            <p className="text-muted-foreground">
              Manage eligible voters ({students.length} total)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button disabled={importing} onClick={() => document.getElementById('file-input')?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import Excel'}
          </Button>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
            disabled={importing}
          />
          <Button
            onClick={handleGenerateVotingCards}
            disabled={generatingCards || students.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {generatingCards ? 'Generating...' : 'Generate Voting Cards'}
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="font-medium">{selectedIds.size} student(s) selected</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Search Students</CardTitle>
            <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={students.length === 0}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Clear All Students
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, student ID, or email..."
            value={searching}
            onChange={(e) => setSearching(e.target.value)}
          />
        </CardContent>
      </Card>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {students.length === 0
                ? 'No students imported yet. Use the Import Excel button to add students.'
                : 'No students found matching your search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
            <CardDescription>Showing {filteredStudents.length} of {students.length} students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">
                      <Checkbox
                        checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left py-2 px-4">Student ID</th>
                    <th className="text-left py-2 px-4">Student Name</th>
                    <th className="text-left py-2 px-4">Class</th>
                    <th className="text-left py-2 px-4">PIN</th>
                    <th className="text-left py-2 px-4">Voted</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-muted">
                      <td className="py-2 px-4">
                        <Checkbox
                          checked={selectedIds.has(student.id)}
                          onCheckedChange={() => toggleSelect(student.id)}
                        />
                      </td>
                      <td className="py-2 px-4">{student.student_id || '-'}</td>
                      <td className="py-2 px-4">{student.name}</td>
                      <td className="py-2 px-4">{student.class || '-'}</td>
                      <td className="py-2 px-4 font-mono text-xs bg-muted p-2 rounded">
                        {student.pin}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            student.has_voted
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {student.has_voted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
