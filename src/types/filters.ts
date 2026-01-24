export type CallStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface CallFilters {
  scoreMin?: number
  scoreMax?: number
  status?: CallStatus[]
  dateFrom?: string
  dateTo?: string
  keyword?: string
}

export type ScoreRange = 'all' | 'critical' | 'warning' | 'good'
export type DateRange = 'all' | 'today' | '7days' | '30days'

// Keywords legales predefinidos para Enterprise
export const LEGAL_KEYWORDS = ['PROFECO', 'demanda', 'abogado', 'queja'] as const
export type LegalKeyword = typeof LEGAL_KEYWORDS[number]
