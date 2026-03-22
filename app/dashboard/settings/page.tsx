'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, RefreshCw, Trash2, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [resetting, setResetting] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password')
        return
      }

      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleResetSystem = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL election data including students, positions, candidates, and votes. This action CANNOT be undone!')) {
      return
    }

    if (!confirm('Are you absolutely sure? Type YES in the next prompt to confirm.')) {
      return
    }

    const confirmation = prompt('Type "RESET" to confirm system reset:')
    if (confirmation !== 'RESET') {
      alert('Reset cancelled')
      return
    }

    setResetting(true)

    try {
      const res = await fetch('/api/system/reset', {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to reset system')

      alert('System reset successfully! Redirecting to dashboard...')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      alert('Failed to reset system')
    } finally {
      setResetting(false)
    }
  }

  const handleClearVotes = async () => {
    if (!confirm('This will clear all votes but keep students, positions, and candidates. Continue?')) {
      return
    }

    try {
      const res = await fetch('/api/system/clear-votes', {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to clear votes')

      alert('Votes cleared successfully!')
      router.refresh()
    } catch (error) {
      alert('Failed to clear votes')
    }
  }

  const handleClearBallot = async () => {
    if (!confirm('This will delete all positions and candidates but keep students. Continue?')) {
      return
    }

    try {
      const res = await fetch('/api/system/clear-ballot', {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to clear ballot')

      alert('Ballot cleared successfully!')
      router.refresh()
    } catch (error) {
      alert('Failed to clear ballot')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src="/Convergence%20Logo-distro.png" alt="Convergence E-Vote" className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Manage election system and data</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your admin account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
                {passwordSuccess}
              </div>
            )}
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <CardTitle className="text-yellow-900">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-yellow-700">
            These actions are irreversible. Use with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
            <div>
              <p className="font-medium">Clear Votes Only</p>
              <p className="text-sm text-muted-foreground">
                Reset all votes but keep students and ballot setup
              </p>
            </div>
            <Button variant="outline" onClick={handleClearVotes}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Votes
            </Button>
          </div>

          <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
            <div>
              <p className="font-medium">Clear Ballot Setup</p>
              <p className="text-sm text-muted-foreground">
                Delete all positions and candidates but keep students
              </p>
            </div>
            <Button variant="outline" onClick={handleClearBallot}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Ballot
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle className="text-red-900">Complete System Reset</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            This will permanently delete ALL data and reset the system for a new election.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <p className="font-medium text-red-900 mb-2">What will be deleted:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>All students and voter records</li>
                <li>All positions and candidates</li>
                <li>All votes and results</li>
                <li>All audit logs</li>
              </ul>
              <p className="text-sm text-red-700 mt-3 font-medium">
                ⚠️ Admin accounts will NOT be deleted
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={handleResetSystem}
              disabled={resetting}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {resetting ? 'Resetting System...' : 'Reset Entire System'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Application</span>
            <span className="font-medium">Electoral Commission Admin</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Institution</span>
            <span className="font-medium">Convergence E-Vote</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


