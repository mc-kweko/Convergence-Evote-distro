'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface School {
  id: string
  name: string
  slug: string
  hasActiveElection: boolean
}

type Step = 'school' | 'pin'

export default function VotingPortalPage() {
  const router = useRouter()

  // Step
  const [step, setStep] = useState<Step>('school')

  // School selection
  const [schools, setSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [schoolSearch, setSchoolSearch] = useState('')
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)

  // Student search
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState<Array<{ id: string; name: string; student_id: string; class?: string; has_voted: boolean }>>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; student_id: string; class?: string } | null>(null)

  // PIN
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)

  // Load schools
  useEffect(() => {
    fetch('/api/schools/public')
      .then(r => r.json())
      .then((data: School[]) => setSchools(Array.isArray(data) ? data : []))
      .catch(() => setSchools([]))
      .finally(() => setSchoolsLoading(false))
  }, [])

  // Pre-select school from URL ?school=slug
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('school')
    if (slug && schools.length > 0) {
      const match = schools.find(s => s.slug === slug.toLowerCase().trim())
      if (match) setSelectedSchool(match)
    }
  }, [schools])

  // Debounced student search
  useEffect(() => {
    if (!selectedSchool || studentSearch.length < 2) { setStudents([]); return }
    const t = setTimeout(() => {
      setStudentsLoading(true)
      fetch(`/api/students?school=${encodeURIComponent(selectedSchool.slug)}&search=${encodeURIComponent(studentSearch)}&limit=20`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setStudents(Array.isArray(data) ? data : []))
        .catch(() => setStudents([]))
        .finally(() => setStudentsLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch, selectedSchool])

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase())
  )

  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school)
    setSchoolSearch('')
    setStudents([])
    setStudentSearch('')
    setSelectedStudent(null)
  }

  const handleSelectStudent = (student: typeof students[0]) => {
    setSelectedStudent(student)
    setStudentSearch('')
    setStudents([])
  }

  const handleProceedToPin = () => {
    if (!selectedSchool || !selectedStudent) return
    setPin('')
    setPinError('')
    setRemainingAttempts(null)
    setStep('pin')
  }

  const handlePinSubmit = useCallback(async () => {
    if (!selectedSchool || !selectedStudent || pin.length < 6) return
    setPinLoading(true)
    setPinError('')

    try {
      const res = await fetch('/api/voting/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          pin,
          school_slug: selectedSchool.slug,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setPinError(data.error || 'Too many attempts. Please wait before trying again.')
          setRemainingAttempts(0)
        } else {
          setPinError(data.error || 'Invalid PIN. Please try again.')
          if (typeof data.remainingAttempts === 'number') {
            setRemainingAttempts(data.remainingAttempts)
          }
        }
        setPin('')
        return
      }

      router.push('/vote')
    } catch {
      setPinError('Connection error. Please check your internet and try again.')
    } finally {
      setPinLoading(false)
    }
  }, [selectedSchool, selectedStudent, pin, router])

  // Auto-submit when PIN reaches 8 digits
  useEffect(() => {
    if (pin.length === 8 && step === 'pin' && !pinLoading) {
      handlePinSubmit()
    }
  }, [pin, step, pinLoading, handlePinSubmit])

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-slate-900 to-slate-800"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 40%, #1a3a6b 100%)' }}>

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Omicron School Vote</p>
            <p className="text-slate-400 text-xs">Secure. Simple. Trusted.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Portal Active
        </div>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-lg">

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            {(['school', 'pin'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${step === s ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : i < (['school', 'pin'] as Step[]).indexOf(step) ? 'bg-emerald-700 text-white' : 'bg-white/10 text-slate-400'}`}>
                  {i < (['school', 'pin'] as Step[]).indexOf(step) ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:block ${step === s ? 'text-white font-medium' : 'text-slate-400'}`}>
                  {s === 'school' ? 'Select School' : 'Enter PIN'}
                </span>
                {i < 1 && <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: School + Student ── */}
          {step === 'school' && (
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-slate-900">Find Your School</CardTitle>
                <p className="text-sm text-slate-500">Select your school to begin voting</p>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* School selector */}
                {!selectedSchool ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Search Your School</label>
                    <Input
                      placeholder="Type school name..."
                      value={schoolSearch}
                      onChange={e => setSchoolSearch(e.target.value)}
                      className="h-12 text-base"
                      autoFocus
                    />
                    {schoolsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-slate-500 text-sm justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading schools...
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                        {filteredSchools.length === 0 ? (
                          <p className="text-center py-6 text-slate-400 text-sm">No schools found</p>
                        ) : filteredSchools.map(school => (
                          <button
                            key={school.id}
                            onClick={() => handleSelectSchool(school)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="font-medium text-slate-900 group-hover:text-blue-700">{school.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{school.slug}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {school.hasActiveElection
                                ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Voting Open</span>
                                : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Not Active</span>
                              }
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* School selected — show student search */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div>
                        <p className="text-xs text-emerald-600 font-medium mb-0.5">Selected School</p>
                        <p className="font-semibold text-slate-900">{selectedSchool.name}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedSchool(null); setSelectedStudent(null) }}
                        className="text-slate-500 hover:text-slate-700 text-xs">
                        Change
                      </Button>
                    </div>

                    {!selectedSchool.hasActiveElection && (
                      <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">Voting is not currently active for this school. Please contact your election administrator.</p>
                      </div>
                    )}

                    {selectedSchool.hasActiveElection && !selectedStudent && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Search Your Name</label>
                        <Input
                          placeholder="Type your name or student ID..."
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                          className="h-12 text-base"
                          autoFocus
                        />
                        <p className="text-xs text-slate-400">Type at least 2 characters to search</p>

                        {studentsLoading && (
                          <div className="flex items-center gap-2 py-3 text-slate-400 text-sm justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                          </div>
                        )}

                        {students.length > 0 && (
                          <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                            {students.map(student => (
                              <button
                                key={student.id}
                                onClick={() => !student.has_voted && handleSelectStudent(student)}
                                disabled={student.has_voted}
                                className={`w-full text-left px-4 py-3 border-b last:border-0 transition-colors
                                  ${student.has_voted ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-blue-50 cursor-pointer'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-slate-900">{student.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {student.student_id}{student.class ? ` · ${student.class}` : ''}
                                    </p>
                                  </div>
                                  {student.has_voted
                                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Already Voted</span>
                                    : <ChevronRight className="w-4 h-4 text-slate-300" />
                                  }
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {studentSearch.length >= 2 && !studentsLoading && students.length === 0 && (
                          <p className="text-center py-4 text-slate-400 text-sm">No students found. Check spelling or contact your school.</p>
                        )}
                      </div>
                    )}

                    {selectedStudent && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 font-medium mb-0.5">Voting as</p>
                          <p className="font-bold text-slate-900 text-lg">{selectedStudent.name}</p>
                          <p className="text-xs text-slate-500">{selectedStudent.student_id}{selectedStudent.class ? ` · ${selectedStudent.class}` : ''}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="text-xs text-slate-500">
                          Not me
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selectedSchool?.hasActiveElection && selectedStudent && (
                  <Button onClick={handleProceedToPin} className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-lg shadow-emerald-600/20">
                    Continue to PIN Entry
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}

                {/* Instructions */}
                <div className="border border-blue-100 bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                  <p className="font-semibold">How to vote:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Select your school</li>
                    <li>Search and select your name</li>
                    <li>Enter the 8-digit PIN from your voting card</li>
                    <li>Choose your candidates and submit</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: PIN ── */}
          {step === 'pin' && selectedSchool && selectedStudent && (
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
              <CardHeader className="pb-4">
                <button onClick={() => setStep('school')}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <CardTitle className="text-2xl text-slate-900">Enter Your Voting PIN</CardTitle>
                <p className="text-sm text-slate-500">
                  Voting as <span className="font-semibold text-slate-700">{selectedStudent.name}</span> at{' '}
                  <span className="font-semibold text-slate-700">{selectedSchool.name}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">8-Digit PIN</label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••••••"
                    value={pin}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setPin(val)
                      if (pinError) setPinError('')
                    }}
                    className="h-16 text-center text-3xl tracking-[0.5em] font-mono border-2 focus:border-emerald-500"
                    autoFocus
                    disabled={pinLoading}
                  />
                  <p className="text-xs text-slate-400 text-center">
                    Your PIN is printed on your physical voting card. Do not share it.
                  </p>
                </div>

                {pinError && (
                  <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">{pinError}</p>
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="text-xs text-red-600 mt-1">{remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining</p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handlePinSubmit}
                  className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-lg shadow-emerald-600/20"
                  disabled={pin.length < 6 || pinLoading || remainingAttempts === 0}
                >
                  {pinLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
                  ) : 'Verify PIN & Access Ballot'}
                </Button>

                <div className="border border-slate-200 rounded-lg p-3 text-xs text-slate-500 space-y-1 text-center">
                  <ShieldCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                  Your vote is anonymous and encrypted. Your PIN authenticates you but is never stored in our system after verification.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-6">
            © {new Date().getFullYear()} Omicron School Vote. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
