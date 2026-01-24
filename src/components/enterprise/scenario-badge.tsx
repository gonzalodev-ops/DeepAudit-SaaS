'use client'

import { cn } from '@/lib/utils'
import type { CallScenario } from '@/types/database'

interface ScenarioBadgeProps {
  scenario: CallScenario | null
}

const scenarioConfig: Record<CallScenario, { label: string; className: string }> = {
  retention: {
    label: 'Retencion',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  cancellation: {
    label: 'Cancelacion',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  dispute: {
    label: 'Disputa',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  collection: {
    label: 'Cobranza',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  support: {
    label: 'Soporte',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  sales: {
    label: 'Ventas',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
}

export function ScenarioBadge({ scenario }: ScenarioBadgeProps) {
  if (!scenario) {
    return (
      <span className="text-muted-foreground text-sm">-</span>
    )
  }

  const config = scenarioConfig[scenario]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
