/**
 * Tests for Filters
 */

import {
  parseFiltersFromParams,
  serializeFiltersToParams,
  hasActiveFilters,
  getScoreRangeFromFilters,
  getDateRangeFromFilters,
  scoreRangeToFilters,
  dateRangeToFilters,
} from '@/lib/filters'
import { CallFilters } from '@/types/filters'

describe('parseFiltersFromParams', () => {
  it('parses scoreMin correctly', () => {
    const params = new URLSearchParams('scoreMin=80')
    const filters = parseFiltersFromParams(params)
    expect(filters.scoreMin).toBe(80)
  })

  it('parses scoreMax correctly', () => {
    const params = new URLSearchParams('scoreMax=100')
    const filters = parseFiltersFromParams(params)
    expect(filters.scoreMax).toBe(100)
  })

  it('parses status as array', () => {
    const params = new URLSearchParams('status=completed&status=processing')
    const filters = parseFiltersFromParams(params)
    expect(filters.status).toEqual(['completed', 'processing'])
  })

  it('parses date range correctly', () => {
    const params = new URLSearchParams('dateFrom=2024-01-01&dateTo=2024-01-31')
    const filters = parseFiltersFromParams(params)
    expect(filters.dateFrom).toBe('2024-01-01')
    expect(filters.dateTo).toBe('2024-01-31')
  })

  it('parses keyword correctly', () => {
    const params = new URLSearchParams('keyword=PROFECO')
    const filters = parseFiltersFromParams(params)
    expect(filters.keyword).toBe('PROFECO')
  })

  it('returns empty object for no params', () => {
    const params = new URLSearchParams('')
    const filters = parseFiltersFromParams(params)
    expect(Object.keys(filters).length).toBe(0)
  })
})

describe('serializeFiltersToParams', () => {
  it('serializes scoreMin correctly', () => {
    const filters: CallFilters = { scoreMin: 80 }
    const params = serializeFiltersToParams(filters)
    expect(params.get('scoreMin')).toBe('80')
  })

  it('serializes keyword correctly', () => {
    const filters: CallFilters = { keyword: 'PROFECO' }
    const params = serializeFiltersToParams(filters)
    expect(params.get('keyword')).toBe('PROFECO')
  })

  it('serializes multiple status values', () => {
    const filters: CallFilters = { status: ['completed', 'processing'] }
    const params = serializeFiltersToParams(filters)
    expect(params.getAll('status')).toEqual(['completed', 'processing'])
  })

  it('returns empty params for empty filters', () => {
    const filters: CallFilters = {}
    const params = serializeFiltersToParams(filters)
    expect(params.toString()).toBe('')
  })
})

describe('hasActiveFilters', () => {
  it('returns false for empty filters', () => {
    expect(hasActiveFilters({})).toBe(false)
  })

  it('returns true when scoreMin is set', () => {
    expect(hasActiveFilters({ scoreMin: 80 })).toBe(true)
  })

  it('returns true when keyword is set', () => {
    expect(hasActiveFilters({ keyword: 'PROFECO' })).toBe(true)
  })

  it('returns true when status is set', () => {
    expect(hasActiveFilters({ status: ['completed'] })).toBe(true)
  })
})

describe('getScoreRangeFromFilters', () => {
  it('returns "critical" for 0-59 range', () => {
    expect(getScoreRangeFromFilters({ scoreMin: 0, scoreMax: 59 })).toBe('critical')
  })

  it('returns "warning" for 60-79 range', () => {
    expect(getScoreRangeFromFilters({ scoreMin: 60, scoreMax: 79 })).toBe('warning')
  })

  it('returns "good" for 80-100 range', () => {
    expect(getScoreRangeFromFilters({ scoreMin: 80, scoreMax: 100 })).toBe('good')
  })

  it('returns "all" for no score filters', () => {
    expect(getScoreRangeFromFilters({})).toBe('all')
  })
})

describe('scoreRangeToFilters', () => {
  it('converts "critical" to 0-59 range', () => {
    const filters = scoreRangeToFilters('critical')
    expect(filters.scoreMin).toBe(0)
    expect(filters.scoreMax).toBe(59)
  })

  it('converts "warning" to 60-79 range', () => {
    const filters = scoreRangeToFilters('warning')
    expect(filters.scoreMin).toBe(60)
    expect(filters.scoreMax).toBe(79)
  })

  it('converts "good" to 80-100 range', () => {
    const filters = scoreRangeToFilters('good')
    expect(filters.scoreMin).toBe(80)
    expect(filters.scoreMax).toBe(100)
  })

  it('converts "all" to empty filters', () => {
    const filters = scoreRangeToFilters('all')
    expect(filters.scoreMin).toBeUndefined()
    expect(filters.scoreMax).toBeUndefined()
  })
})

describe('getDateRangeFromFilters', () => {
  it('returns "all" for no date filters', () => {
    expect(getDateRangeFromFilters({})).toBe('all')
  })
})

describe('dateRangeToFilters', () => {
  it('converts "today" to today date range', () => {
    const filters = dateRangeToFilters('today')
    expect(filters.dateFrom).toBeDefined()
    expect(filters.dateTo).toBeDefined()
  })

  it('converts "all" to empty filters', () => {
    const filters = dateRangeToFilters('all')
    expect(filters.dateFrom).toBeUndefined()
    expect(filters.dateTo).toBeUndefined()
  })
})
