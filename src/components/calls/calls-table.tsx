'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Loader2 } from 'lucide-react'

interface CallItem {
  id: string
  created_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  duration_seconds: number | null
  agent?: { full_name: string | null } | null
  audit?: { overall_score: number | null } | null
}

interface CallsTableProps {
  calls: CallItem[]
}

const statusConfig = {
  pending: { label: 'Pendiente', variant: 'secondary' as const },
  processing: { label: 'Procesando', variant: 'default' as const },
  completed: { label: 'Completado', variant: 'default' as const },
  failed: { label: 'Error', variant: 'destructive' as const },
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">-</span>

  let colorClass = 'bg-red-100 text-red-800'
  if (score >= 80) colorClass = 'bg-green-100 text-green-800'
  else if (score >= 60) colorClass = 'bg-yellow-100 text-yellow-800'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {score.toFixed(0)}%
    </span>
  )
}

export function CallsTable({ calls }: CallsTableProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay llamadas registradas.</p>
        <p className="text-sm mt-1">Sube un audio para comenzar.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Agente</TableHead>
          <TableHead>Duracion</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Score</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {calls.map((call) => {
          const status = statusConfig[call.status]

          return (
            <TableRow key={call.id}>
              <TableCell className="font-medium">
                {formatDistanceToNow(new Date(call.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </TableCell>
              <TableCell>
                {call.agent?.full_name || 'Sin asignar'}
              </TableCell>
              <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
              <TableCell>
                <Badge variant={status.variant} className="gap-1">
                  {call.status === 'processing' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                <ScoreBadge score={call.audit?.overall_score ?? null} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/calls/${call.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
