import { CallFilters, CallStatus, ScoreRange, DateRange } from '@/types/filters'

/**
 * Parse filters from URL search params
 */
export function parseFiltersFromParams(searchParams: { [key: string]: string | string[] | undefined }): CallFilters {
  const filters: CallFilters = {}

  // Parse score range
  const scoreMin = searchParams.scoreMin
  const scoreMax = searchParams.scoreMax
  if (scoreMin && typeof scoreMin === 'string') {
    const parsed = parseInt(scoreMin, 10)
    if (!isNaN(parsed)) filters.scoreMin = parsed
  }
  if (scoreMax && typeof scoreMax === 'string') {
    const parsed = parseInt(scoreMax, 10)
    if (!isNaN(parsed)) filters.scoreMax = parsed
  }

  // Parse status (comma-separated)
  const status = searchParams.status
  if (status && typeof status === 'string') {
    const statuses = status.split(',').filter(s =>
      ['pending', 'processing', 'completed', 'failed'].includes(s)
    ) as CallStatus[]
    if (statuses.length > 0) filters.status = statuses
  }

  // Parse date range
  const dateFrom = searchParams.dateFrom
  const dateTo = searchParams.dateTo
  if (dateFrom && typeof dateFrom === 'string') {
    filters.dateFrom = dateFrom
  }
  if (dateTo && typeof dateTo === 'string') {
    filters.dateTo = dateTo
  }

  // Parse keyword (for legal search)
  const keyword = searchParams.keyword
  if (keyword && typeof keyword === 'string') {
    filters.keyword = keyword.trim()
  }

  return filters
}

/**
 * Serialize filters to URL search params
 */
export function serializeFiltersToParams(filters: CallFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.scoreMin !== undefined) {
    params.set('scoreMin', filters.scoreMin.toString())
  }
  if (filters.scoreMax !== undefined) {
    params.set('scoreMax', filters.scoreMax.toString())
  }
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','))
  }
  if (filters.dateFrom) {
    params.set('dateFrom', filters.dateFrom)
  }
  if (filters.dateTo) {
    params.set('dateTo', filters.dateTo)
  }
  if (filters.keyword) {
    params.set('keyword', filters.keyword)
  }

  return params
}

/**
 * Check if there are any active filters
 */
export function hasActiveFilters(filters: CallFilters): boolean {
  return (
    filters.scoreMin !== undefined ||
    filters.scoreMax !== undefined ||
    (filters.status !== undefined && filters.status.length > 0) ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    (filters.keyword !== undefined && filters.keyword.length > 0)
  )
}

/**
 * Get score range from min/max values
 */
export function getScoreRangeFromFilters(filters: CallFilters): ScoreRange {
  if (filters.scoreMin === undefined && filters.scoreMax === undefined) {
    return 'all'
  }
  if (filters.scoreMax !== undefined && filters.scoreMax < 60) {
    return 'critical'
  }
  if (filters.scoreMin !== undefined && filters.scoreMin >= 60 && filters.scoreMax !== undefined && filters.scoreMax < 80) {
    return 'warning'
  }
  if (filters.scoreMin !== undefined && filters.scoreMin >= 80) {
    return 'good'
  }
  return 'all'
}

/**
 * Get date range from dateFrom/dateTo values
 */
export function getDateRangeFromFilters(filters: CallFilters): DateRange {
  if (!filters.dateFrom && !filters.dateTo) {
    return 'all'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  if (filters.dateFrom === todayStr) {
    return 'today'
  }

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  if (filters.dateFrom === sevenDaysAgo.toISOString().split('T')[0]) {
    return '7days'
  }

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  if (filters.dateFrom === thirtyDaysAgo.toISOString().split('T')[0]) {
    return '30days'
  }

  return 'all'
}

/**
 * Convert score range to filter values
 */
export function scoreRangeToFilters(range: ScoreRange): Pick<CallFilters, 'scoreMin' | 'scoreMax'> {
  switch (range) {
    case 'critical':
      return { scoreMin: 0, scoreMax: 59 }
    case 'warning':
      return { scoreMin: 60, scoreMax: 79 }
    case 'good':
      return { scoreMin: 80, scoreMax: 100 }
    case 'all':
    default:
      return {}
  }
}

/**
 * Convert date range to filter values
 */
export function dateRangeToFilters(range: DateRange): Pick<CallFilters, 'dateFrom' | 'dateTo'> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (range) {
    case 'today':
      return { dateFrom: today.toISOString().split('T')[0] }
    case '7days': {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return { dateFrom: sevenDaysAgo.toISOString().split('T')[0] }
    }
    case '30days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return { dateFrom: thirtyDaysAgo.toISOString().split('T')[0] }
    }
    case 'all':
    default:
      return {}
  }
}
