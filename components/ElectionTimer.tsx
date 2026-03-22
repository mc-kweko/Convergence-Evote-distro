'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, Play, Pause, Plus } from 'lucide-react'

interface ElectionStatus {
  is_active: boolean
  started_at: string | null
  ended_at: string | null
  time_remaining: number
}

export default function ElectionTimer() {
  const [status, setStatus] = useState<ElectionStatus | null>(null)
  const [localTime, setLocalTime] = useState<number>(0)
  const [duration, setDuration] = useState(60)
  const [extendDuration, setExtendDuration] = useState(30)
  const [portalUrl, setPortalUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const lastFetchRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (status?.is_active && status.time_remaining > 0) {
      setLocalTime(status.time_remaining)
      lastFetchRef.current = Date.now()
      
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setLocalTime(prev => {
          const newTime = Math.max(0, prev - 1)
          if (newTime === 0) {
            // Auto-stop voting when time expires
            handleAutoStop()
          }
          return newTime
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setLocalTime(0)
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status?.is_active, status?.time_remaining])

  const handleAutoStop = async () => {
    try {
      await fetch('/api/election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      await fetchStatus()
    } catch (error) {
      console.error('Auto-stop error:', error)
    }
  }

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/election', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Error fetching election status:', error)
    }
  }

  const handleStart = async () => {
    if (!confirm(`Deploy portal and start voting for ${duration} minutes?`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy_and_start', duration_minutes: duration })
      })

      const result = await res.json()

      if (!res.ok) {
        alert(`Failed to deploy and start voting: ${result.error || 'Unknown error'}`)
        return
      }
      
      if (result.portal_url) {
        setPortalUrl(result.portal_url)
      }
      alert('Portal deployed and voting started successfully!')
      await fetchStatus()
    } catch (error) {
      alert('Failed to deploy portal and start voting')
    } finally {
      setLoading(false)
    }
  }

  const handleExtend = async () => {
    if (!confirm(`Extend voting by ${extendDuration} minutes?`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', duration_minutes: extendDuration })
      })

      if (!res.ok) throw new Error('Failed to extend election')
      
      alert('Voting extended successfully!')
      fetchStatus()
    } catch (error) {
      alert('Failed to extend voting')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!confirm('Stop voting immediately? This cannot be undone.')) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      if (!res.ok) throw new Error('Failed to stop election')
      
      alert('Voting stopped successfully!')
      fetchStatus()
    } catch (error) {
      alert('Failed to stop voting')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Election Timer Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.is_active && localTime > 0 ? (
          <>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Voting is Active</p>
              <p className="text-3xl font-bold text-green-900">
                {formatTime(localTime)}
              </p>
              <p className="text-xs text-green-700 mt-1">Time Remaining</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Extend Voting Time (minutes)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    min="1"
                    value={extendDuration}
                    onChange={(e) => setExtendDuration(Number(e.target.value))}
                    className="flex-1"
                  />
                  <Button onClick={handleExtend} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Extend
                  </Button>
                </div>
              </div>

              <Button 
                variant="destructive" 
                onClick={handleStop} 
                disabled={loading}
                className="w-full"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop Voting Now
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-800">Voting is Inactive</p>
              <p className="text-xs text-gray-600 mt-1">Start voting to allow students to cast their votes</p>
            </div>

            <div>
              <Label>Voting Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleStart} 
              disabled={loading}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Deploy Portal and Start Election
            </Button>
          </>
        )}

        {portalUrl && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">Election Portal Live</p>
            <p className="mt-1 text-xs break-all">
              URL: <a href={portalUrl} className="underline" target="_blank" rel="noreferrer">{portalUrl}</a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
