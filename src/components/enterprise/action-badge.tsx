'use client'

import { XCircle, AlertTriangle, Star, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestedAction } from '@/types/database'

interface ActionBadgeProps {
  action: SuggestedAction | null
}

const actionConfig = {
  immediate_termination: {
    label: 'Despido Inmediato',
    icon: XCircle,
    className: 'bg-[#DC2626] text-white',
  },
  urgent_coaching: {
    label: 'Coaching Urgente',
    icon: AlertTriangle,
    className: 'bg-[#EA580C] text-white',
  },
  standard_coaching: {
    label: 'Coaching',
    icon: null,
    className: 'bg-yellow-500 text-white',
  },
  model_script: {
    label: 'Modelar Script',
    icon: Star,
    className: 'bg-[#16A34A] text-white',
  },
  recognition: {
    label: 'Reconocimiento',
    icon: Award,
    className: 'bg-[#003B6D] text-white',
  },
  none: {
    label: 'Sin accion',
    icon: null,
    className: 'bg-gray-400 text-white',
  },
}

export function ActionBadge({ action }: ActionBadgeProps) {
  if (!action) {
    return (
      <span className="text-muted-foreground text-sm">-</span>
    )
  }

  const config = actionConfig[action]
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
