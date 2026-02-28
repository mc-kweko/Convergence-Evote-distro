'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Vote,
  LogOut,
  Menu,
  X,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  role: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/')
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Students', href: '/dashboard/students' },
    { icon: Vote, label: 'Ballot Setup', href: '/dashboard/ballot' },
    { icon: BarChart3, label: 'Results', href: '/dashboard/results' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Jinja College badge.png" alt="Jinja College" className="w-10 h-10 object-contain" />
            {sidebarOpen && <h2 className="text-xl font-bold">EC Admin</h2>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          {sidebarOpen && (
            <div className="px-4 py-2 text-sm">
              <p className="text-slate-400">Logged in as</p>
              <p className="font-medium truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
          <img src="/Jinja College badge.png" alt="Jinja College" className="w-8 h-8 object-contain" />
          <h1 className="text-sm text-gray-600">Electoral Commission Admin Dashboard - Jinja College</h1>
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
