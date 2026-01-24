'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScenarioBadge } from '@/components/enterprise/scenario-badge'
import { SentimentIndicator } from '@/components/enterprise/sentiment-indicator'
import { OutcomeBadge } from '@/components/enterprise/outcome-badge'
import type { CallWithAudit, CriterionScore } from '@/types/database'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ComparePage() {
  const [calls, setCalls] = useState<CallWithAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall1, setSelectedCall1] = useState<CallWithAudit | null>(null)
  const [selectedCall2, setSelectedCall2] = useState<CallWithAudit | null>(null)
  const [showTranscript1, setShowTranscript1] = useState(false)
  const [showTranscript2, setShowTranscript2] = useState(false)

  // Fetch completed calls with audits
  useEffect(() => {
    async function fetchCalls() {
      const supabase = createClient()

      const { data: callsData } = await supabase
        .from('calls')
        .select(`
          *,
          agent:users(id, full_name, email)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50) as { data: Record<string, unknown>[] | null }

      if (!callsData) {
        setLoading(false)
        return
      }

      // Get audits for these calls
      const callIds = callsData.map((c) => c.id as string)
      const { data: audits } = await supabase
        .from('audits')
        .select('*')
        .in('call_id', callIds) as { data: Record<string, unknown>[] | null }

      // Map calls with audits
      const callsWithAudits = callsData.map((call) => ({
        ...call,
        audit: audits?.find((a) => a.call_id === call.id) || null
      })) as CallWithAudit[]

      setCalls(callsWithAudits)
      setLoading(false)
    }

    fetchCalls()
  }, [])


  // Get score background for comparison
  const getScoreBg = useCallback((score1: number | null, score2: number | null, isFirst: boolean) => {
    if (!score1 || !score2) return ''
    const diff = Math.abs(score1 - score2)
    if (diff < 5) return '' // Scores are similar

    if (isFirst) {
      return score1 > score2 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    } else {
      return score2 > score1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }
  }, [])

  // Check if criteria differ significantly (>20 points)
  const criteriaSignificantDiff = useCallback((criterion1: CriterionScore | undefined, criterion2: CriterionScore | undefined) => {
    if (!criterion1 || !criterion2) return false
    return Math.abs(criterion1.score - criterion2.score) > 20
  }, [])

  // Render call selector
  const renderCallSelector = (
    selectedCall: CallWithAudit | null,
    onSelect: (call: CallWithAudit) => void,
    label: string,
    excludeId?: string
  ) => {
    const availableCalls = calls.filter(c => c.id !== excludeId)

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-12">
            <span className="truncate">
              {selectedCall
                ? `${format(new Date(selectedCall.created_at), 'dd/MM/yyyy HH:mm')} - Score: ${selectedCall.audit?.overall_score || '-'}%`
                : label}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto">
          {availableCalls.map((call) => (
            <DropdownMenuItem
              key={call.id}
              onClick={() => onSelect(call)}
              className="flex justify-between items-center py-3"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {format(new Date(call.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
                <span className="text-sm text-muted-foreground">
                  {call.agent?.full_name || 'Sin agente'}
                </span>
              </div>
              <Badge
                variant={call.audit?.overall_score && call.audit.overall_score >= 80 ? 'default' : 'secondary'}
                className={cn(
                  call.audit?.overall_score && call.audit.overall_score < 60 && 'bg-red-100 text-red-800'
                )}
              >
                {call.audit?.overall_score || '-'}%
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Render call comparison card
  const renderCallCard = (
    call: CallWithAudit,
    otherCall: CallWithAudit | null,
    isFirst: boolean,
    showTranscript: boolean,
    setShowTranscript: (show: boolean) => void
  ) => {
    const audit = call.audit
    const otherAudit = otherCall?.audit

    if (!audit) return null

    const score = audit.overall_score || 0
    const otherScore = otherAudit?.overall_score || 0
    const isHigherScore = otherCall && score > otherScore
    const isLowerScore = otherCall && score < otherScore

    return (
      <Card className={cn(
        'flex-1 transition-all',
        otherCall && getScoreBg(score, otherScore, isFirst)
      )}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">
                {format(new Date(call.created_at), "d 'de' MMMM, yyyy", { locale: es })}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {call.agent?.full_name || 'Sin agente asignado'}
              </p>
            </div>
            <div className={cn(
              'flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold',
              isHigherScore ? 'bg-green-100 text-green-700' :
              isLowerScore ? 'bg-red-100 text-red-700' :
              score >= 80 ? 'bg-green-100 text-green-700' :
              score >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {score}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enterprise Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Escenario</p>
              <ScenarioBadge scenario={audit.call_scenario} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sentimiento</p>
              <SentimentIndicator sentiment={audit.client_sentiment} />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Resultado</p>
              <OutcomeBadge outcome={audit.call_outcome} />
            </div>
          </div>

          <Separator />

          {/* Criteria Scores */}
          <div>
            <p className="text-sm font-medium mb-3">Criterios Evaluados</p>
            <div className="space-y-3">
              {audit.criteria_scores?.map((cs: CriterionScore) => {
                const otherCriterion = otherAudit?.criteria_scores?.find(
                  (ocs: CriterionScore) => ocs.criterion_id === cs.criterion_id || ocs.criterion_name === cs.criterion_name
                )
                const hasSigDiff = criteriaSignificantDiff(cs, otherCriterion)
                const isBetter = otherCriterion && cs.score > otherCriterion.score
                const isWorse = otherCriterion && cs.score < otherCriterion.score

                return (
                  <div
                    key={cs.criterion_id}
                    className={cn(
                      'rounded-lg p-2 transition-colors',
                      hasSigDiff && isBetter && 'bg-green-50 border border-green-200',
                      hasSigDiff && isWorse && 'bg-red-50 border border-red-200'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{cs.criterion_name}</span>
                      <span className={cn(
                        'font-bold text-sm',
                        hasSigDiff && isBetter && 'text-green-600',
                        hasSigDiff && isWorse && 'text-red-600',
                        !hasSigDiff && cs.score >= 80 && 'text-green-600',
                        !hasSigDiff && cs.score >= 60 && cs.score < 80 && 'text-yellow-600',
                        !hasSigDiff && cs.score < 60 && 'text-red-600'
                      )}>
                        {cs.score}%
                        {hasSigDiff && (
                          <span className="text-xs ml-1">
                            ({isBetter ? '+' : ''}{cs.score - (otherCriterion?.score || 0)})
                          </span>
                        )}
                      </span>
                    </div>
                    <Progress value={cs.score} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Strengths */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Fortalezas
            </p>
            <ul className="space-y-1">
              {audit.strengths?.slice(0, 3).map((s: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Areas de Mejora
            </p>
            <ul className="space-y-1">
              {audit.areas_for_improvement?.slice(0, 3).map((a: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">!</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Collapsible Transcript */}
          <div>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcripcion
              </span>
              <ChevronRight className={cn(
                'h-4 w-4 transition-transform',
                showTranscript && 'rotate-90'
              )} />
            </Button>
            {showTranscript && (
              <ScrollArea className="h-48 mt-3 rounded-md border p-3">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {audit.transcript || 'Transcripcion no disponible'}
                </p>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Comparar Llamadas" description="Analisis lado a lado de dos llamadas" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Comparar Llamadas" description="Analisis lado a lado de dos llamadas" />

      <div className="p-6 space-y-6">
        {/* Call Selectors */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                {renderCallSelector(selectedCall1, setSelectedCall1, 'Seleccionar Llamada 1', selectedCall2?.id)}
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-muted rounded-full p-2">
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 w-full">
                {renderCallSelector(selectedCall2, setSelectedCall2, 'Seleccionar Llamada 2', selectedCall1?.id)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison View */}
        {selectedCall1 && selectedCall2 ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {renderCallCard(selectedCall1, selectedCall2, true, showTranscript1, setShowTranscript1)}
            {renderCallCard(selectedCall2, selectedCall1, false, showTranscript2, setShowTranscript2)}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Selecciona dos llamadas para comparar</h3>
              <p className="text-muted-foreground mt-1">
                Usa los selectores de arriba para elegir las llamadas que deseas analizar lado a lado.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary if both selected */}
        {selectedCall1 && selectedCall2 && selectedCall1.audit && selectedCall2.audit && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Comparacion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Diferencia de Score</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    Math.abs((selectedCall1.audit.overall_score || 0) - (selectedCall2.audit.overall_score || 0)) > 20
                      ? 'text-orange-600'
                      : 'text-gray-600'
                  )}>
                    {Math.abs((selectedCall1.audit.overall_score || 0) - (selectedCall2.audit.overall_score || 0))} puntos
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Mejor Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.max(selectedCall1.audit.overall_score || 0, selectedCall2.audit.overall_score || 0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Criterios con Diferencia Significativa</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedCall1.audit.criteria_scores?.filter((cs: CriterionScore) => {
                      const other = selectedCall2.audit?.criteria_scores?.find(
                        (ocs: CriterionScore) => ocs.criterion_id === cs.criterion_id || ocs.criterion_name === cs.criterion_name
                      )
                      return other && Math.abs(cs.score - other.score) > 20
                    }).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
