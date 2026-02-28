'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function VotingSuccessPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img src="/Jinja College badge.png" alt="Jinja College" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-3xl">Vote Submitted!</CardTitle>
          <p className="text-muted-foreground mt-2">Jinja College Electoral Commission</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Thank you for participating in the election. Your vote has been recorded successfully.
          </p>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              Your vote is anonymous and secure. Results will be announced after the voting period ends.
            </p>
          </div>
          <Button onClick={() => router.push('/voting')} className="w-full" size="lg">
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
