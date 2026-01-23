import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CallsTable } from '@/components/calls/calls-table'
import { Upload } from 'lucide-react'

// Force dynamic rendering - requires database connection at runtime
export const dynamic = 'force-dynamic'

async function getCalls() {
  const supabase = await createServiceClient()

  const { data: calls } = await supabase
    .from('calls')
    .select(`
      *,
      agent:users(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (!calls) return []

  // Get audits for these calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callIds = calls.map((c: any) => c.id)
  const { data: audits } = await supabase
    .from('audits')
    .select('*')
    .in('call_id', callIds)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return calls.map((call: any) => ({
    ...call,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audit: audits?.find((a: any) => a.call_id === call.id) || null
  }))
}

export default async function CallsPage() {
  const calls = await getCalls()

  return (
    <div className="flex flex-col">
      <Header
        title="Llamadas"
        description="Historial de llamadas y auditorias"
      />

      <div className="p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Todas las Llamadas</CardTitle>
            <Button asChild>
              <Link href="/upload">
                <Upload className="h-4 w-4 mr-2" />
                Subir Audio
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <CallsTable calls={calls} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
