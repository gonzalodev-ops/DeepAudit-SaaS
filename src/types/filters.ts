export type CallStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface CallFilters {
  scoreMin?: number
  scoreMax?: number
  status?: CallStatus[]
  dateFrom?: string
  dateTo?: string
}

export type ScoreRange = 'all' | 'critical' | 'warning' | 'good'
export type DateRange = 'all' | 'today' | '7days' | '30days'
