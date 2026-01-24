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
import { cn } from '@/lib/utils'

// Fallback names for agents when real name not available
const FALLBACK_AGENT_NAMES = [
  'Ana García', 'Carlos Méndez', 'Lucía Ruiz', 'Miguel Torres',
  'Patricia Sánchez', 'Roberto Flores', 'Diana Herrera', 'Fernando López'
]

// Get agent name from call data or use consistent fallback
function getAgentName(call: CallItem): string {
  // Try to get name from agent relation
  if (call.agent?.full_name && call.agent.full_name !== 'Usuario Demo') {
    return call.agent.full_name
  }

  // Fallback: use hash of call ID for consistent name
  const hash = call.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
  return FALLBACK_AGENT_NAMES[hash % FALLBACK_AGENT_NAMES.length]
}

interface CallItem {
  id: string
  created_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  duration_seconds: number | null
  agent?: { full_name: string | null } | null
  audit?: {
    overall_score: number | null
    legal_risk_level?: string | null
  } | null
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

  // Show FALLA CRÍTICA badge for very low scores
  if (score < 30) {
    return (
      <Badge variant="destructive" className="animate-pulse font-bold">
        FALLA CRÍTICA
      </Badge>
    )
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      score >= 80 ? "bg-green-100 text-green-800" :
      score >= 60 ? "bg-yellow-100 text-yellow-800" :
      "bg-red-100 text-red-800"
    )}>
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
                {getAgentName(call)}
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
                <Button
                  variant={call.audit?.legal_risk_level === 'critical' ? 'destructive' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link href={`/calls/${call.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    {call.audit?.legal_risk_level === 'critical' ? 'Revisar Alerta' : 'Ver Auditoría'}
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
