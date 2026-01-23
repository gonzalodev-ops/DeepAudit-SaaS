import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  FileText,
  BarChart3,
  Clock,
  User,
  Loader2,
  DollarSign,
  Cpu
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AudioPlayer } from '@/components/audio/audio-player'
import { RegenerateButton } from '@/components/audit/regenerate-button'

// Force dynamic rendering - requires database connection at runtime
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCallWithAudit(id: string) {
  const supabase = await createServiceClient()

  const { data: call } = await supabase
    .from('calls')
    .select(`
      *,
      agent:users(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!call) return null

  const { data: audit } = await supabase
    .from('audits')
    .select('*')
    .eq('call_id', id)
    .single()

  return { ...call, audit }
}

function ScoreCircle({ score }: { score: number }) {
  let colorClass = 'text-red-500'
  let bgClass = 'bg-red-100'
  if (score >= 80) {
    colorClass = 'text-green-500'
    bgClass = 'bg-green-100'
  } else if (score >= 60) {
    colorClass = 'text-yellow-500'
    bgClass = 'bg-yellow-100'
  }

  return (
    <div className={`relative w-32 h-32 ${bgClass} rounded-full flex items-center justify-center`}>
      <div className="text-center">
        <span className={`text-4xl font-bold ${colorClass}`}>{score.toFixed(0)}</span>
        <span className={`text-lg ${colorClass}`}>%</span>
      </div>
    </div>
  )
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default async function CallDetailPage({ params }: PageProps) {
  const { id } = await params
  const call = await getCallWithAudit(id)

  if (!call) {
    notFound()
  }

  const audit = call.audit
  const isProcessing = call.status === 'processing'
  const isFailed = call.status === 'failed'
  const isPending = call.status === 'pending'

  return (
    <div className="flex flex-col">
      <Header title="Detalle de Auditoria" />

      <div className="p-6 space-y-6">
        {/* Back button and status */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            {/* Regenerate button for compliance mode or critical cases */}
            {audit && (
              <RegenerateButton
                callId={call.id}
                currentMode={audit.processing_mode || 'full'}
                hasFatalViolation={audit.summary?.includes('FALLO FATAL')}
                score={audit.overall_score || 100}
              />
            )}

            <Badge
              variant={
                call.status === 'completed'
                  ? 'default'
                  : call.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
              }
              className="text-sm"
            >
              {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {call.status === 'completed' && 'Completado'}
              {call.status === 'processing' && 'Procesando...'}
              {call.status === 'pending' && 'Pendiente'}
              {call.status === 'failed' && 'Error'}
            </Badge>
          </div>
        </div>

        {/* Processing state */}
        {(isProcessing || isPending) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <h3 className="text-lg font-medium">Procesando llamada...</h3>
              <p className="text-muted-foreground mt-1">
                El analisis de IA puede tomar unos minutos.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Failed state */}
        {isFailed && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium">Error al procesar</h3>
              <p className="text-muted-foreground mt-1">
                No se pudo completar el analisis. Por favor intenta de nuevo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completed audit view */}
        {call.status === 'completed' && audit && (
          <>
            {/* Call info and score overview */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Informacion de la Llamada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha</p>
                        <p className="font-medium">
                          {format(new Date(call.created_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Agente</p>
                        <p className="font-medium">{call.agent?.full_name || 'Sin asignar'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Duracion</p>
                      <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modo</p>
                      <Badge variant="outline" className="mt-1">
                        {audit.processing_mode === 'compliance' ? 'Compliance' : 'Completo'}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Resumen</p>
                    <p>{audit.summary}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Score General</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ScoreCircle score={audit.overall_score || 0} />
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Basado en {audit.criteria_scores?.length || 0} criterios evaluados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Audio Player and Token Info */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Audio Player with Key Moments */}
              {call.audio_url && (
                <AudioPlayer
                  audioUrl={call.audio_url}
                  keyMoments={audit.key_moments || []}
                  duration={call.duration_seconds || undefined}
                />
              )}

              {/* Token Usage Info */}
              {audit.total_tokens && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Uso de IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Tokens Input</p>
                        <p className="text-lg font-medium">{audit.input_tokens?.toLocaleString() || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tokens Output</p>
                        <p className="text-lg font-medium">{audit.output_tokens?.toLocaleString() || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tokens</p>
                        <p className="text-lg font-medium">{audit.total_tokens?.toLocaleString() || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Costo
                        </p>
                        <p className="text-lg font-medium text-emerald-600">
                          ${audit.cost_usd?.toFixed(4) || '0.0000'} USD
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tabs for details */}
            <Tabs defaultValue="scores" className="w-full">
              <TabsList>
                <TabsTrigger value="scores" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Criterios
                </TabsTrigger>
                <TabsTrigger value="transcript" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Transcripcion
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Feedback
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scores" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Evaluacion por Criterio</CardTitle>
                    <CardDescription>
                      Desglose detallado de cada aspecto evaluado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {audit.criteria_scores?.map((cs: any) => (
                      <div key={cs.criterion_id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cs.criterion_name}</span>
                          <span className={`font-bold ${
                            cs.score >= 80 ? 'text-green-600' :
                            cs.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {cs.score}%
                          </span>
                        </div>
                        <Progress value={cs.score} className="h-2" />
                        <p className="text-sm text-muted-foreground">{cs.feedback}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transcript" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transcripcion</CardTitle>
                    <CardDescription>
                      {audit.processing_mode === 'compliance'
                        ? 'Modo Compliance: Solo citas clave (sin transcripcion completa por normativa)'
                        : 'Transcripcion completa de la conversacion'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {audit.transcript ? (
                      <ScrollArea className="h-[400px] rounded-md border p-4">
                        <p className="whitespace-pre-wrap">{audit.transcript}</p>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">Transcripcion no disponible</p>
                        <p className="text-sm mt-1">
                          Esta auditoria se proceso en modo Compliance.
                          <br />
                          Usa el reproductor de audio para escuchar los momentos clave.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback" className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Fortalezas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {audit.strengths?.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">+</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        Areas de Mejora
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {audit.areas_for_improvement?.map((a: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">!</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-blue-500" />
                        Recomendaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{audit.recommendations}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
