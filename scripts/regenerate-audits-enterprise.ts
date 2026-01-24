/**
 * Script de Regeneracion Enterprise para DeepAudit
 *
 * Este script REPROCESA COMPLETAMENTE las auditorias existentes con el nuevo
 * prompt Enterprise, generando NUEVOS costos de tokens.
 *
 * Uso:
 *   npx tsx scripts/regenerate-audits-enterprise.ts
 *   npx tsx scripts/regenerate-audits-enterprise.ts --dry-run
 *   npx tsx scripts/regenerate-audits-enterprise.ts --limit 5
 *   npx tsx scripts/regenerate-audits-enterprise.ts --force  # reprocesa incluso si ya tiene campos Enterprise
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.GEMINI_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!geminiApiKey) {
  console.error('ERROR: Missing GEMINI_API_KEY in .env.local')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const genAI = new GoogleGenerativeAI(geminiApiKey)

// Pricing for Gemini 2.5 Flash
const PRICING = {
  inputPer1M: 0.15,
  outputPer1M: 0.60,
}

// Types
type CallScenario = 'retention' | 'cancellation' | 'dispute' | 'collection' | 'support' | 'sales'
type ClientSentiment = 'hostile' | 'negative' | 'neutral' | 'positive' | 'enthusiastic'
type LegalRiskLevel = 'critical' | 'high' | 'medium' | 'safe'
type CallOutcome = 'retained' | 'churned' | 'hung_up' | 'escalated' | 'pending'
type SuggestedAction = 'immediate_termination' | 'urgent_coaching' | 'standard_coaching' | 'model_script' | 'recognition' | 'none'

interface AuditResult {
  transcript: string | null
  overall_score: number
  summary: string
  strengths: string[]
  areas_for_improvement: string[]
  criteria_scores: Array<{
    criterion_id: string
    criterion_name: string
    score: number
    max_score: number
    feedback: string
  }>
  recommendations: string
  duration_seconds?: number
  fatal_violation?: boolean
  violation_codes?: string[]
  key_moments?: Array<{
    timestamp: string
    speaker: 'agent' | 'client'
    quote: string
    context: string
  }>
  // Enterprise fields
  call_scenario: CallScenario
  client_sentiment: ClientSentiment
  legal_risk_level: LegalRiskLevel
  legal_risk_reasons: string[]
  call_outcome: CallOutcome
  suggested_action: SuggestedAction
  // Token usage
  token_usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const forceReprocess = args.includes('--force')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null

/**
 * Build the complete Enterprise prompt
 */
function buildEnterprisePrompt(manualText: string | null): string {
  const manualSection = manualText
    ? `\n\nMANUAL DE CALIDAD DE LA EMPRESA:\n${manualText}\n`
    : ''

  return `Eres un auditor de calidad experto en Contact Centers. Analiza el siguiente audio de una llamada telefonica de servicio al cliente.
${manualSection}
CRITERIOS DE EVALUACION:
1. Respeto y Cortesia (25%): Trato profesional, uso de nombre, despedida cordial
2. Cumplimiento de Protocolo (20%): Saludo institucional, verificacion de datos, ofrecimiento de ayuda
3. Resolucion del Problema (25%): Entendimiento de necesidad, solucion efectiva, confirmacion
4. Comunicacion Clara (15%): Lenguaje apropiado, explicaciones claras, sin jerga tecnica innecesaria
5. Cierre Profesional (15%): Resumen de acuerdos, ofrecimiento adicional, despedida

CONDUCTAS DE CERO TOLERANCIA (FALLO FATAL - Score = 0):
- ETI-01: Agresion Verbal - Insultos, lenguaje soez, burlas al cliente
- ETI-02: Gaslighting Operativo - Culpar al cliente, invalidar quejas, ridiculizar
- ETI-03: Abandono Hostil - Colgar mientras el cliente habla, negar folio

CAMPOS ENTERPRISE ADICIONALES:

1. call_scenario: Tipo de escenario
   - "retention": Retencion de cliente
   - "cancellation": Cancelacion de servicio
   - "dispute": Disputa o reclamo
   - "collection": Cobranza
   - "support": Soporte tecnico
   - "sales": Ventas

2. client_sentiment: Sentimiento del cliente
   - "hostile": Agresivo, amenazante
   - "negative": Frustrado, molesto
   - "neutral": Tranquilo
   - "positive": Satisfecho
   - "enthusiastic": Muy contento

3. legal_risk_level: Riesgo legal
   - "critical": Violaciones ETI, amenazas de demanda explicitas
   - "high": Menciones de PROFECO/abogados sin escalamiento
   - "medium": Quejas formales no atendidas
   - "safe": Sin riesgo

4. legal_risk_reasons: Array de razones del riesgo (vacio si es "safe")

5. call_outcome: Resultado
   - "retained": Cliente retenido
   - "churned": Cliente perdido
   - "hung_up": Llamada colgada
   - "escalated": Escalado a supervisor
   - "pending": Pendiente

6. suggested_action: Accion sugerida
   - "immediate_termination": Violacion ETI (score 0)
   - "urgent_coaching": Score < 50
   - "standard_coaching": Score 50-70
   - "model_script": Score > 90 + retencion
   - "recognition": Score > 85
   - "none": Sin accion

RESPONDE EN JSON EXACTO (sin markdown):
{
  "transcript": "Transcripcion completa con [Agente] y [Cliente]...",
  "overall_score": 85,
  "summary": "Resumen ejecutivo de la llamada...",
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "areas_for_improvement": ["Area de mejora 1"],
  "criteria_scores": [
    {"criterion_id": "1", "criterion_name": "Respeto y Cortesia", "score": 90, "max_score": 100, "feedback": "..."}
  ],
  "recommendations": "Recomendaciones especificas...",
  "fatal_violation": false,
  "violation_codes": [],
  "key_moments": [
    {"timestamp": "1:23", "speaker": "client", "quote": "Cita textual", "context": "Por que es relevante"}
  ],
  "call_scenario": "support",
  "client_sentiment": "neutral",
  "legal_risk_level": "safe",
  "legal_risk_reasons": [],
  "call_outcome": "pending",
  "suggested_action": "none"
}`
}

/**
 * Calculate cost from tokens
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PRICING.inputPer1M
  const outputCost = (outputTokens / 1_000_000) * PRICING.outputPer1M
  return inputCost + outputCost
}

/**
 * Process audio with Gemini and get full Enterprise result
 */
async function processAudioWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  manualText: string | null
): Promise<AuditResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = buildEnterprisePrompt(manualText)

  // Convert buffer to base64
  const base64Audio = audioBuffer.toString('base64')

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    },
  ])

  const response = await result.response
  const text = response.text()

  // Get token usage
  const usageMetadata = response.usageMetadata
  const inputTokens = usageMetadata?.promptTokenCount || 0
  const outputTokens = usageMetadata?.candidatesTokenCount || 0
  const totalTokens = usageMetadata?.totalTokenCount || inputTokens + outputTokens
  const costUsd = calculateCost(inputTokens, outputTokens)

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Gemini response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate and return
  return {
    transcript: parsed.transcript || null,
    overall_score: Math.min(100, Math.max(0, parsed.overall_score || 0)),
    summary: parsed.summary || '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    areas_for_improvement: Array.isArray(parsed.areas_for_improvement) ? parsed.areas_for_improvement : [],
    criteria_scores: Array.isArray(parsed.criteria_scores) ? parsed.criteria_scores : [],
    recommendations: parsed.recommendations || '',
    duration_seconds: parsed.duration_seconds,
    fatal_violation: !!parsed.fatal_violation,
    violation_codes: Array.isArray(parsed.violation_codes) ? parsed.violation_codes : [],
    key_moments: Array.isArray(parsed.key_moments) ? parsed.key_moments : [],
    call_scenario: parsed.call_scenario || 'support',
    client_sentiment: parsed.client_sentiment || 'neutral',
    legal_risk_level: parsed.legal_risk_level || 'safe',
    legal_risk_reasons: Array.isArray(parsed.legal_risk_reasons) ? parsed.legal_risk_reasons : [],
    call_outcome: parsed.call_outcome || 'pending',
    suggested_action: parsed.suggested_action || 'none',
    token_usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
    },
  }
}

/**
 * Check if audit already has enterprise fields populated
 */
function hasEnterpriseFields(audit: { call_scenario: string | null }): boolean {
  return audit.call_scenario !== null
}

/**
 * Main regeneration function
 */
async function regenerateAuditsEnterprise(): Promise<void> {
  console.log('='.repeat(60))
  console.log('DeepAudit Enterprise - Regeneracion COMPLETA de Auditorias')
  console.log('='.repeat(60))
  console.log('\nEste script REPROCESA el audio y calcula NUEVOS tokens/costos')

  if (isDryRun) {
    console.log('MODO: Dry Run (no se guardaran cambios)')
  }
  if (forceReprocess) {
    console.log('MODO: Force (reprocesa incluso si ya tiene campos Enterprise)')
  }
  if (limit) {
    console.log(`LIMITE: ${limit} auditorias`)
  }

  console.log('\n[1/5] Verificando columnas Enterprise...')

  const { error: columnTestError } = await supabase
    .from('audits')
    .select('call_scenario')
    .limit(1)

  if (columnTestError) {
    console.error('ERROR: Las columnas Enterprise no existen.')
    console.error('Ejecute primero: docs/migrations/003_add_enterprise_fields.sql')
    process.exit(1)
  }

  console.log('  Columnas verificadas OK')

  console.log('\n[2/5] Obteniendo auditorias con sus llamadas...')

  // Get audits with their calls (to get audio URL)
  let query = supabase
    .from('audits')
    .select(`
      id,
      call_id,
      call_scenario,
      calls!inner (
        id,
        audio_url,
        tenant_id,
        tenants (
          manual_text
        )
      )
    `)
    .order('processed_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data: audits, error: auditsError } = await query

  if (auditsError) {
    console.error('Error obteniendo auditorias:', auditsError)
    process.exit(1)
  }

  if (!audits || audits.length === 0) {
    console.log('  No hay auditorias para procesar.')
    return
  }

  console.log(`  Encontradas ${audits.length} auditorias`)

  // Filter if not forcing
  let auditsToProcess = audits
  if (!forceReprocess) {
    auditsToProcess = audits.filter(a => !hasEnterpriseFields(a))
    const skipped = audits.length - auditsToProcess.length
    if (skipped > 0) {
      console.log(`  ${skipped} ya tienen campos Enterprise (usar --force para reprocesar)`)
    }
  }

  if (auditsToProcess.length === 0) {
    console.log('  No hay auditorias pendientes.')
    return
  }

  console.log(`  ${auditsToProcess.length} auditorias para procesar`)

  console.log('\n[3/5] Procesando auditorias con Gemini...')

  let processed = 0
  let failed = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCostUsd = 0
  const startTime = Date.now()

  for (const audit of auditsToProcess) {
    processed++
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (audit as any).calls
    const audioUrl = call?.audio_url

    console.log(`\n  [${processed}/${auditsToProcess.length}] Auditoria: ${audit.id}`)

    if (!audioUrl) {
      console.log('    OMITIDA: Sin URL de audio')
      failed++
      continue
    }

    try {
      // Download audio
      console.log('    Descargando audio...')
      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) {
        throw new Error(`Failed to download: ${audioResponse.status}`)
      }

      const arrayBuffer = await audioResponse.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = audioResponse.headers.get('content-type') || 'audio/mpeg'

      console.log(`    Audio: ${(buffer.length / 1024).toFixed(1)} KB`)

      // Get manual text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manualText = (call?.tenants as any)?.manual_text || null

      // Process with Gemini
      console.log('    Procesando con Gemini Enterprise...')
      const result = await processAudioWithGemini(buffer, mimeType, manualText)

      // Track totals
      totalInputTokens += result.token_usage.inputTokens
      totalOutputTokens += result.token_usage.outputTokens
      totalCostUsd += result.token_usage.costUsd

      console.log(`    Score: ${result.overall_score}`)
      console.log(`    Escenario: ${result.call_scenario}`)
      console.log(`    Sentimiento: ${result.client_sentiment}`)
      console.log(`    Riesgo Legal: ${result.legal_risk_level}`)
      console.log(`    Resultado: ${result.call_outcome}`)
      console.log(`    Accion: ${result.suggested_action}`)
      console.log(`    Tokens: input=${result.token_usage.inputTokens}, output=${result.token_usage.outputTokens}`)
      console.log(`    Costo: $${result.token_usage.costUsd.toFixed(6)} USD`)

      if (!isDryRun) {
        // Update audit with ALL new data
        const { error: updateError } = await supabase
          .from('audits')
          .update({
            transcript: result.transcript,
            overall_score: result.overall_score,
            summary: result.summary,
            strengths: result.strengths,
            areas_for_improvement: result.areas_for_improvement,
            criteria_scores: result.criteria_scores,
            recommendations: result.recommendations,
            key_moments: result.key_moments,
            // Token usage (NEW)
            input_tokens: result.token_usage.inputTokens,
            output_tokens: result.token_usage.outputTokens,
            total_tokens: result.token_usage.totalTokens,
            cost_usd: result.token_usage.costUsd,
            // Enterprise fields
            call_scenario: result.call_scenario,
            client_sentiment: result.client_sentiment,
            legal_risk_level: result.legal_risk_level,
            legal_risk_reasons: result.legal_risk_reasons,
            call_outcome: result.call_outcome,
            suggested_action: result.suggested_action,
            // Update timestamp
            processed_at: new Date().toISOString(),
          })
          .eq('id', audit.id)

        if (updateError) {
          console.error(`    ERROR: ${updateError.message}`)
          failed++
        } else {
          console.log('    Actualizada OK')
        }
      } else {
        console.log('    [DRY RUN] No guardado')
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`    ERROR: ${error}`)
      failed++
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n[4/5] Resumen de Costos')
  console.log('='.repeat(60))
  console.log(`  Input Tokens Total:  ${totalInputTokens.toLocaleString()}`)
  console.log(`  Output Tokens Total: ${totalOutputTokens.toLocaleString()}`)
  console.log(`  Costo Total USD:     $${totalCostUsd.toFixed(6)}`)
  console.log(`  Costo Total MXN:     $${(totalCostUsd * 20).toFixed(2)} (TC: $20)`)

  console.log('\n[5/5] Resumen de Procesamiento')
  console.log('='.repeat(60))
  console.log(`  Auditorias encontradas: ${audits.length}`)
  console.log(`  Procesadas: ${processed}`)
  console.log(`  Exitosas: ${processed - failed}`)
  console.log(`  Fallidas: ${failed}`)
  console.log(`  Tiempo: ${elapsed}s`)

  if (isDryRun) {
    console.log('\n  NOTA: Dry Run - No se guardaron cambios.')
  }

  console.log('\n' + '='.repeat(60))
  console.log('Regeneracion completada.')
}

// Run
regenerateAuditsEnterprise()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error)
    process.exit(1)
  })
