'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ElectionTimer from '@/components/ElectionTimer'
import {
  BarChart3,
  Users,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsVoted: 0,
    votesCount: 0,
    positionsCount: 0,
  })
  const [isVotingActive, setIsVotingActive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const [studentsRes, positionsRes, electionRes] = await Promise.all([
        fetch('/api/students').catch(() => null),
        fetch('/api/positions').catch(() => null),
        fetch('/api/election').catch(() => null),
      ])

      const students = studentsRes && studentsRes.ok ? await studentsRes.json() : []
      const positions = positionsRes && positionsRes.ok ? await positionsRes.json() : []
      const election = electionRes && electionRes.ok ? await electionRes.json() : null

      const studentsVoted = students.filter((s: any) => s.has_voted).length
      const totalVotes = studentsVoted * positions.length

      setStats({
        totalStudents: students.length,
        studentsVoted: studentsVoted,
        votesCount: totalVotes,
        positionsCount: positions.length,
      })
      
      setIsVotingActive(election?.is_active && election?.time_remaining > 0)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const statCards = [
    {
      title: 'Eligible Voters',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Students registered',
    },
    {
      title: 'Students Voted',
      value: stats.studentsVoted,
      icon: CheckCircle2,
      color: 'bg-green-500',
      description: `${stats.totalStudents > 0 ? ((stats.studentsVoted / stats.totalStudents) * 100).toFixed(1) : 0}% turnout`,
    },
    {
      title: 'Total Votes Cast',
      value: stats.votesCount,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      description: `${stats.studentsVoted} × ${stats.positionsCount} positions`,
    },
    {
      title: 'Positions',
      value: stats.positionsCount,
      icon: BarChart3,
      color: 'bg-purple-500',
      description: 'Available positions',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <img src="/Convergence%20Logo-distro.png" alt="Convergence E-Vote" className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-3xl font-bold">Omicron School Vote</h1>
          <p className="text-2xl font-semibold text-muted-foreground">Dashboard</p>
          <p className="text-muted-foreground">Omicron School Vote Admin Portal</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Election Timer Control */}
      <ElectionTimer />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Election Status</CardTitle>
            <CardDescription>Current election state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Voting Period</span>
              <span className={`font-semibold ${isVotingActive ? 'text-green-600' : 'text-gray-600'}`}>
                {isVotingActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Students Voted</span>
              <span className="font-semibold">{stats.studentsVoted} / {stats.totalStudents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Votes Cast</span>
              <span className="font-semibold">{stats.votesCount}</span>
            </div>
            {stats.totalStudents > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span>Turnout</span>
                  <span className="font-semibold">
                    {((stats.studentsVoted / stats.totalStudents) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(stats.studentsVoted / stats.totalStudents) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Important notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.totalStudents === 0 && (
              <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">No students imported</p>
                  <p className="text-xs text-yellow-700">Import student data to begin</p>
                </div>
              </div>
            )}
            {stats.positionsCount === 0 && (
              <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">No positions created</p>
                  <p className="text-xs text-yellow-700">Create ballot positions to start</p>
                </div>
              </div>
            )}
            {stats.totalStudents > 0 && stats.positionsCount > 0 && (
              <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">System ready for voting</p>
                  <p className="text-xs text-green-700">All required setup complete</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


