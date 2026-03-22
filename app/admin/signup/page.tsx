'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SchoolSignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    school_name: '',
    school_email: '',
    admin_email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/school-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create school workspace')
        return
      }

      setMessage(`Workspace created. Portal slug: ${data.school.slug}`)
      setTimeout(() => router.push('/admin'), 1200)
    } catch (err) {
      setError('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create School Workspace</CardTitle>
          <CardDescription>Launch your institution on Convergence E-Vote</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>School Name</Label>
              <Input value={form.school_name} onChange={(e) => setForm((p) => ({ ...p, school_name: e.target.value }))} required />
            </div>
            <div>
              <Label>School Email</Label>
              <Input type="email" value={form.school_email} onChange={(e) => setForm((p) => ({ ...p, school_email: e.target.value }))} required />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input type="email" value={form.admin_email} onChange={(e) => setForm((p) => ({ ...p, admin_email: e.target.value }))} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Already onboarded? <Link href="/admin" className="underline">Go to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
