'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, X, Search, AlertTriangle } from 'lucide-react'
import { CallFilters, CallStatus, ScoreRange, DateRange, LEGAL_KEYWORDS } from '@/types/filters'
import {
  parseFiltersFromParams,
  serializeFiltersToParams,
  hasActiveFilters,
  getScoreRangeFromFilters,
  getDateRangeFromFilters,
  scoreRangeToFilters,
  dateRangeToFilters,
} from '@/lib/filters'
import { isEnterpriseMode } from '@/lib/feature-flags'

const STATUS_LABELS: Record<CallStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
}

const SCORE_RANGE_LABELS: Record<ScoreRange, string> = {
  all: 'Todos',
  critical: 'Critico (<60)',
  warning: 'Alerta (60-79)',
  good: 'Bueno (80+)',
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'Todo',
  today: 'Hoy',
  '7days': 'Ultimos 7 dias',
  '30days': 'Ultimos 30 dias',
}

export function CallsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const enterpriseMode = isEnterpriseMode()

  // Parse current filters from URL
  const currentFilters = parseFiltersFromParams(
    Object.fromEntries(searchParams.entries())
  )

  // Local state for keyword input
  const [keywordInput, setKeywordInput] = useState(currentFilters.keyword || '')

  const currentScoreRange = getScoreRangeFromFilters(currentFilters)
  const currentDateRange = getDateRangeFromFilters(currentFilters)
  const showClearButton = hasActiveFilters(currentFilters)

  // Update URL with new filters
  const updateFilters = useCallback(
    (newFilters: CallFilters) => {
      const params = serializeFiltersToParams(newFilters)
      const queryString = params.toString()
      router.push(queryString ? `?${queryString}` : '/', { scroll: false })
    },
    [router]
  )

  // Handle score range change
  const handleScoreRangeChange = useCallback(
    (range: ScoreRange) => {
      const scoreFilters = scoreRangeToFilters(range)
      const newFilters: CallFilters = {
        ...currentFilters,
        scoreMin: scoreFilters.scoreMin,
        scoreMax: scoreFilters.scoreMax,
      }
      // Remove undefined values
      if (scoreFilters.scoreMin === undefined) delete newFilters.scoreMin
      if (scoreFilters.scoreMax === undefined) delete newFilters.scoreMax
      updateFilters(newFilters)
    },
    [currentFilters, updateFilters]
  )

  // Handle status change
  const handleStatusToggle = useCallback(
    (status: CallStatus) => {
      const currentStatuses = currentFilters.status || []
      let newStatuses: CallStatus[]

      if (currentStatuses.includes(status)) {
        newStatuses = currentStatuses.filter((s) => s !== status)
      } else {
        newStatuses = [...currentStatuses, status]
      }

      const newFilters: CallFilters = {
        ...currentFilters,
        status: newStatuses.length > 0 ? newStatuses : undefined,
      }
      if (newStatuses.length === 0) delete newFilters.status
      updateFilters(newFilters)
    },
    [currentFilters, updateFilters]
  )

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      const dateFilters = dateRangeToFilters(range)
      const newFilters: CallFilters = {
        ...currentFilters,
        dateFrom: dateFilters.dateFrom,
        dateTo: dateFilters.dateTo,
      }
      // Remove undefined values
      if (dateFilters.dateFrom === undefined) delete newFilters.dateFrom
      if (dateFilters.dateTo === undefined) delete newFilters.dateTo
      updateFilters(newFilters)
    },
    [currentFilters, updateFilters]
  )

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setKeywordInput('')
    router.push('/', { scroll: false })
  }, [router, setKeywordInput])

  // Handle keyword change (search in transcript and legal_risk_reasons)
  const handleKeywordChange = useCallback(
    (keyword: string) => {
      setKeywordInput(keyword)
      const newFilters: CallFilters = {
        ...currentFilters,
        keyword: keyword.trim() || undefined,
      }
      if (!keyword.trim()) delete newFilters.keyword
      updateFilters(newFilters)
    },
    [currentFilters, updateFilters, setKeywordInput]
  )

  // Handle keyword submit (on Enter key)
  const handleKeywordSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleKeywordChange(keywordInput)
      }
    },
    [handleKeywordChange, keywordInput]
  )

  // Handle preset keyword click
  const handlePresetKeyword = useCallback(
    (keyword: string) => {
      setKeywordInput(keyword)
      handleKeywordChange(keyword)
    },
    [handleKeywordChange, setKeywordInput]
  )

  // Get status count for label
  const statusCount = currentFilters.status?.length || 0
  const statusLabel =
    statusCount === 0
      ? 'Todos'
      : statusCount === 1
        ? STATUS_LABELS[currentFilters.status![0]]
        : `${statusCount} seleccionados`

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Score Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            Score: {SCORE_RANGE_LABELS[currentScoreRange]}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Rango de Score</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(SCORE_RANGE_LABELS) as ScoreRange[]).map((range) => (
            <DropdownMenuCheckboxItem
              key={range}
              checked={currentScoreRange === range}
              onCheckedChange={() => handleScoreRangeChange(range)}
            >
              <span className="flex items-center gap-2">
                {SCORE_RANGE_LABELS[range]}
                {range === 'critical' && (
                  <Badge variant="destructive" className="text-xs">
                    Critico
                  </Badge>
                )}
                {range === 'warning' && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                    Alerta
                  </Badge>
                )}
                {range === 'good' && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    Bueno
                  </Badge>
                )}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            Estado: {statusLabel}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Estado de Llamada</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(STATUS_LABELS) as CallStatus[]).map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={currentFilters.status?.includes(status) || false}
              onCheckedChange={() => handleStatusToggle(status)}
            >
              {STATUS_LABELS[status]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            Fecha: {DATE_RANGE_LABELS[currentDateRange]}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Rango de Fecha</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
            <DropdownMenuCheckboxItem
              key={range}
              checked={currentDateRange === range}
              onCheckedChange={() => handleDateRangeChange(range)}
            >
              {DATE_RANGE_LABELS[range]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Keyword Filter - Enterprise Only */}
      {enterpriseMode && (
        <>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar keyword..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordSubmit}
                onBlur={() => handleKeywordChange(keywordInput)}
                className="h-8 w-40 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Preset Legal Keywords */}
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {LEGAL_KEYWORDS.map((keyword) => (
              <Button
                key={keyword}
                variant={currentFilters.keyword === keyword ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePresetKeyword(keyword)}
              >
                {keyword}
              </Button>
            ))}
          </div>

          {/* Active keyword badge */}
          {currentFilters.keyword && (
            <Badge variant="secondary" className="h-7 gap-1">
              <Search className="h-3 w-3" />
              {currentFilters.keyword}
              <button
                onClick={() => handleKeywordChange('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </>
      )}

      {/* Clear Filters */}
      {showClearButton && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground hover:text-foreground"
          onClick={handleClearFilters}
        >
          <X className="mr-1 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
