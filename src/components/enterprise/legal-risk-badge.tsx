'use client'

import { AlertTriangle, AlertCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalRiskLevel } from '@/types/database'

interface LegalRiskBadgeProps {
  level: LegalRiskLevel | null
}

const riskConfig = {
  critical: {
    label: 'CRITICO',
    icon: AlertTriangle,
    className: 'bg-[#DC2626] text-white animate-pulse',
  },
  high: {
    label: 'ALTO',
    icon: AlertCircle,
    className: 'bg-[#EA580C] text-white',
  },
  medium: {
    label: 'MEDIO',
    icon: null,
    className: 'bg-yellow-500 text-white',
  },
  safe: {
    label: 'SEGURO',
    icon: Shield,
    className: 'bg-[#16A34A] text-white',
  },
}

export function LegalRiskBadge({ level }: LegalRiskBadgeProps) {
  if (!level) {
    return (
      <span className="text-muted-foreground text-sm">-</span>
    )
  }

  const config = riskConfig[level]
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
