'use client'

import {
  CheckCircle,
  TrendingDown,
  PhoneOff,
  ArrowUpCircle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CallOutcome } from '@/types/database'

interface OutcomeBadgeProps {
  outcome: CallOutcome | null
}

const outcomeConfig = {
  retained: {
    label: 'Retenido',
    icon: CheckCircle,
    className: 'bg-[#16A34A] text-white',
  },
  churned: {
    label: 'Perdido',
    icon: TrendingDown,
    className: 'bg-[#DC2626] text-white',
  },
  hung_up: {
    label: 'Colgado',
    icon: PhoneOff,
    className: 'bg-red-800 text-white',
  },
  escalated: {
    label: 'Escalado',
    icon: ArrowUpCircle,
    className: 'bg-[#003B6D] text-white',
  },
  pending: {
    label: 'Pendiente',
    icon: Clock,
    className: 'bg-gray-400 text-white',
  },
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  if (!outcome) {
    return (
      <span className="text-muted-foreground text-sm">-</span>
    )
  }

  const config = outcomeConfig[outcome]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        config.className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </span>
  )
}
