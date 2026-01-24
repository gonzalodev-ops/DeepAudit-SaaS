'use client'

import { cn } from '@/lib/utils'
import type { ClientSentiment } from '@/types/database'

interface SentimentIndicatorProps {
  sentiment: ClientSentiment | null
}

const sentimentConfig = {
  hostile: {
    label: 'Hostil',
    dotColor: 'bg-[#DC2626]',
    textColor: 'text-[#DC2626]',
  },
  negative: {
    label: 'Negativo',
    dotColor: 'bg-[#EA580C]',
    textColor: 'text-[#EA580C]',
  },
  neutral: {
    label: 'Neutral',
    dotColor: 'bg-gray-400',
    textColor: 'text-gray-600',
  },
  positive: {
    label: 'Positivo',
    dotColor: 'bg-[#16A34A]',
    textColor: 'text-[#16A34A]',
  },
  enthusiastic: {
    label: 'Entusiasta',
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-500',
  },
}

export function SentimentIndicator({ sentiment }: SentimentIndicatorProps) {
  if (!sentiment) {
    return (
      <span className="text-muted-foreground text-sm">-</span>
    )
  }

  const config = sentimentConfig[sentiment]

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          config.dotColor
        )}
      />
      <span className={cn('text-sm font-medium', config.textColor)}>
        {config.label}
      </span>
    </span>
  )
}
