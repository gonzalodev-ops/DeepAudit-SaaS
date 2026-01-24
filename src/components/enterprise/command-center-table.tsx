'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { LegalRiskBadge } from './legal-risk-badge'
import { SentimentIndicator } from './sentiment-indicator'
import { ActionBadge } from './action-badge'
import { ScenarioBadge } from './scenario-badge'
import { OutcomeBadge } from './outcome-badge'
import type { CallWithAudit } from '@/types/database'

interface CommandCenterTableProps {
  calls: CallWithAudit[]
}

// Ordenamiento por nivel de riesgo legal (critico primero)
const riskOrder = {
  critical: 0,
  high: 1,
  medium: 2,
  safe: 3,
}

function formatCallId(uuid: string): string {
  return `#RT-${uuid.slice(-5).toUpperCase()}`
}

export function CommandCenterTable({ calls }: CommandCenterTableProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay llamadas en el Centro de Comando.</p>
        <p className="text-sm mt-1">Las llamadas procesadas apareceran aqui.</p>
      </div>
    )
  }

  // Ordenar por riesgo legal (critico primero)
  const sortedCalls = [...calls].sort((a, b) => {
    const riskA = a.audit?.legal_risk_level
    const riskB = b.audit?.legal_risk_level

    // Llamadas sin riesgo van al final
    if (!riskA && !riskB) return 0
    if (!riskA) return 1
    if (!riskB) return -1

    return riskOrder[riskA] - riskOrder[riskB]
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Agente</TableHead>
            <TableHead>Escenario</TableHead>
            <TableHead>Sentimiento</TableHead>
            <TableHead>Riesgo Legal</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Accion</TableHead>
            <TableHead className="text-right w-[80px]">Ver</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCalls.map((call) => {
            const isCritical = call.audit?.legal_risk_level === 'critical'

            return (
              <TableRow
                key={call.id}
                className={isCritical ? 'bg-red-50 hover:bg-red-100' : undefined}
              >
                <TableCell className="font-mono text-sm font-medium">
                  <Link
                    href={`/calls/${call.id}`}
                    className="text-[#003B6D] hover:underline"
                  >
                    {formatCallId(call.id)}
                  </Link>
                </TableCell>
                <TableCell>
                  {call.agent?.full_name || (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell>
                  <ScenarioBadge scenario={call.audit?.call_scenario ?? null} />
                </TableCell>
                <TableCell>
                  <SentimentIndicator sentiment={call.audit?.client_sentiment ?? null} />
                </TableCell>
                <TableCell>
                  <LegalRiskBadge level={call.audit?.legal_risk_level ?? null} />
                </TableCell>
                <TableCell>
                  <OutcomeBadge outcome={call.audit?.call_outcome ?? null} />
                </TableCell>
                <TableCell>
                  <ActionBadge action={call.audit?.suggested_action ?? null} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/calls/${call.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
