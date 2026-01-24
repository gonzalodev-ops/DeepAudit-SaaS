/**
 * Script de Regeneracion Enterprise para DeepAudit
 *
 * Este script lee todas las auditorias existentes y las re-procesa
 * para agregar los nuevos campos Enterprise (risk detection, retention, etc.)
 *
 * IMPORTANTE:
 * - Conserva la metadata de tokens/costos existente
 * - Solo agrega los nuevos campos Enterprise
 * - Requiere que la migracion 003_add_enterprise_fields.sql ya se haya ejecutado
 *
 * Uso:
 *   npx tsx scripts/regenerate-audits-enterprise.ts
 *   npx tsx scripts/regenerate-audits-enterprise.ts --dry-run
 *   npx tsx scripts/regenerate-audits-enterprise.ts --limit 5
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

// Types for Enterprise fields
type CallScenario = 'retention' | 'cancellation' | 'dispute' | 'collection' | 'support' | 'sales'
type ClientSentiment = 'hostile' | 'negative' | 'neutral' | 'positive' | 'enthusiastic'
type LegalRiskLevel = 'critical' | 'high' | 'medium' | 'safe'
type CallOutcome = 'retained' | 'churned' | 'hung_up' | 'escalated' | 'pending'
type SuggestedAction = 'immediate_termination' | 'urgent_coaching' | 'standard_coaching' | 'model_script' | 'recognition' | 'none'

interface EnterpriseFields {
  call_scenario: CallScenario | null
  client_sentiment: ClientSentiment | null
  legal_risk_level: LegalRiskLevel | null
  legal_risk_reasons: string[]
  call_outcome: CallOutcome | null
  suggested_action: SuggestedAction | null
}

interface AuditRecord {
  id: string
  call_id: string
  transcript: string | null
  overall_score: number | null
  summary: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  // Enterprise fields (may be null if not yet populated)
  call_scenario: string | null
  client_sentiment: string | null
  legal_risk_level: string | null
  legal_risk_reasons: string[] | null
  call_outcome: string | null
  suggested_action: string | null
}

interface CallRecord {
  id: string
  audio_url: string | null
  tenant_id: string | null
}

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null

/**
 * Build prompt for Enterprise field extraction
 */
function buildEnterprisePrompt(transcript: string | null, summary: string | null): string {
  const context = transcript
    ? `TRANSCRIPCION DE LA LLAMADA:\n${transcript}`
    : `RESUMEN DE LA LLAMADA:\n${summary || 'No disponible'}`

  return `Eres un analista experto en Contact Centers de Telecomunicaciones. Analiza la siguiente llamada y extrae informacion Enterprise para deteccion de riesgos y retencion.

${context}

INSTRUCCIONES:
Analiza la llamada y determina los siguientes campos. Responde SOLO con JSON puro (sin markdown).

1. call_scenario: Tipo de escenario de la llamada
   - "retention": Llamada de retencion, cliente quiere irse pero lo retienen
   - "cancellation": Cancelacion de servicio
   - "dispute": Disputa o reclamo formal
   - "collection": Cobranza o pagos atrasados
   - "support": Soporte tecnico general
   - "sales": Venta de servicios adicionales

2. client_sentiment: Sentimiento predominante del cliente
   - "hostile": Agresivo, amenazante, gritando
   - "negative": Molesto, frustrado, quejandose
   - "neutral": Tranquilo, informativo
   - "positive": Satisfecho, agradecido
   - "enthusiastic": Muy contento, elogioso

3. legal_risk_level: Nivel de riesgo legal detectado
   - "critical": Amenazas explicitas de demanda, mencion de abogados, grabacion mencionada
   - "high": Violaciones de protocolo graves, insultos del agente, informacion incorrecta
   - "medium": Incumplimientos menores, promesas no documentadas
   - "safe": Sin riesgos legales detectados

4. legal_risk_reasons: Array de razones especificas del riesgo legal (vacio si es "safe")
   Ejemplos: ["Cliente menciono demanda", "Agente dio informacion incorrecta sobre facturacion"]

5. call_outcome: Resultado final de la llamada
   - "retained": Cliente retenido exitosamente
   - "churned": Cliente se fue/cancelo
   - "hung_up": Cliente o agente colgo antes de resolver
   - "escalated": Escalado a supervisor
   - "pending": Sin resolucion clara, requiere seguimiento

6. suggested_action: Accion recomendada para el agente
   - "immediate_termination": Despido inmediato por falta grave
   - "urgent_coaching": Coaching urgente en las proximas 24h
   - "standard_coaching": Coaching programado normal
   - "model_script": Usar como ejemplo positivo
   - "recognition": Reconocimiento por excelencia
   - "none": Sin accion requerida

RESPONDE EXACTAMENTE en este formato JSON:
{
  "call_scenario": "support",
  "client_sentiment": "neutral",
  "legal_risk_level": "safe",
  "legal_risk_reasons": [],
  "call_outcome": "pending",
  "suggested_action": "none"
}

Analiza con rigor profesional. Si no hay suficiente informacion para determinar un campo, usa el valor mas conservador/neutro.`
}

/**
 * Process a single audit with Gemini to extract Enterprise fields
 */
async function extractEnterpriseFields(
  transcript: string | null,
  summary: string | null
): Promise<EnterpriseFields> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = buildEnterprisePrompt(transcript, summary)

  try {
    const result = await model.generateContent([{ text: prompt }])
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(jsonMatch[0]) as any

    // Validate and sanitize
    const validScenarios: CallScenario[] = ['retention', 'cancellation', 'dispute', 'collection', 'support', 'sales']
    const validSentiments: ClientSentiment[] = ['hostile', 'negative', 'neutral', 'positive', 'enthusiastic']
    const validRiskLevels: LegalRiskLevel[] = ['critical', 'high', 'medium', 'safe']
    const validOutcomes: CallOutcome[] = ['retained', 'churned', 'hung_up', 'escalated', 'pending']
    const validActions: SuggestedAction[] = ['immediate_termination', 'urgent_coaching', 'standard_coaching', 'model_script', 'recognition', 'none']

    return {
      call_scenario: validScenarios.includes(parsed.call_scenario) ? parsed.call_scenario : 'support',
      client_sentiment: validSentiments.includes(parsed.client_sentiment) ? parsed.client_sentiment : 'neutral',
      legal_risk_level: validRiskLevels.includes(parsed.legal_risk_level) ? parsed.legal_risk_level : 'safe',
      legal_risk_reasons: Array.isArray(parsed.legal_risk_reasons) ? parsed.legal_risk_reasons : [],
      call_outcome: validOutcomes.includes(parsed.call_outcome) ? parsed.call_outcome : 'pending',
      suggested_action: validActions.includes(parsed.suggested_action) ? parsed.suggested_action : 'none',
    }
  } catch (error) {
    console.error('  Error extracting enterprise fields:', error)
    // Return safe defaults on error
    return {
      call_scenario: 'support',
      client_sentiment: 'neutral',
      legal_risk_level: 'safe',
      legal_risk_reasons: [],
      call_outcome: 'pending',
      suggested_action: 'none',
    }
  }
}

/**
 * Check if audit already has enterprise fields populated
 */
function hasEnterpriseFields(audit: AuditRecord): boolean {
  return (
    audit.call_scenario !== null ||
    audit.client_sentiment !== null ||
    audit.legal_risk_level !== null ||
    audit.call_outcome !== null ||
    audit.suggested_action !== null
  )
}

/**
 * Main regeneration function
 */
async function regenerateAuditsEnterprise(): Promise<void> {
  console.log('='.repeat(60))
  console.log('DeepAudit Enterprise - Regeneracion de Auditorias')
  console.log('='.repeat(60))

  if (isDryRun) {
    console.log('MODO: Dry Run (no se guardaran cambios)')
  }
  if (limit) {
    console.log(`LIMITE: ${limit} auditorias`)
  }

  console.log('\n[1/4] Verificando columnas Enterprise en la base de datos...')

  // Test if enterprise columns exist
  const { error: columnTestError } = await supabase
    .from('audits')
    .select('call_scenario, client_sentiment, legal_risk_level, call_outcome, suggested_action')
    .limit(1)

  if (columnTestError) {
    console.error('ERROR: Las columnas Enterprise no existen en la tabla audits.')
    console.error('Por favor ejecute primero la migracion: docs/migrations/003_add_enterprise_fields.sql')
    console.error('Error:', columnTestError.message)
    process.exit(1)
  }

  console.log('  Columnas Enterprise verificadas OK')

  console.log('\n[2/4] Obteniendo auditorias existentes...')

  // Get all audits that need processing
  let query = supabase
    .from('audits')
    .select('id, call_id, transcript, summary, overall_score, input_tokens, output_tokens, cost_usd, call_scenario, client_sentiment, legal_risk_level, legal_risk_reasons, call_outcome, suggested_action')
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

  // Filter to only audits without enterprise fields
  const auditsToProcess = audits.filter(a => !hasEnterpriseFields(a as AuditRecord))
  const auditsSkipped = audits.length - auditsToProcess.length

  if (auditsSkipped > 0) {
    console.log(`  ${auditsSkipped} auditorias ya tienen campos Enterprise (omitidas)`)
  }

  if (auditsToProcess.length === 0) {
    console.log('  Todas las auditorias ya tienen campos Enterprise.')
    return
  }

  console.log(`  ${auditsToProcess.length} auditorias para procesar`)

  console.log('\n[3/4] Procesando auditorias con Gemini...')

  let processed = 0
  let failed = 0
  const startTime = Date.now()

  for (const audit of auditsToProcess) {
    const auditRecord = audit as AuditRecord
    processed++

    console.log(`\n  [${processed}/${auditsToProcess.length}] Procesando auditoria: ${auditRecord.id}`)
    console.log(`    Call ID: ${auditRecord.call_id}`)
    console.log(`    Score: ${auditRecord.overall_score}`)
    console.log(`    Tokens preservados: input=${auditRecord.input_tokens}, output=${auditRecord.output_tokens}`)
    console.log(`    Costo preservado: $${auditRecord.cost_usd}`)

    // Check if we have transcript or at least summary
    if (!auditRecord.transcript && !auditRecord.summary) {
      console.log('    OMITIDA: Sin transcripcion ni resumen disponible')
      failed++
      continue
    }

    try {
      // Extract enterprise fields using Gemini
      console.log('    Extrayendo campos Enterprise...')
      const enterpriseFields = await extractEnterpriseFields(
        auditRecord.transcript,
        auditRecord.summary
      )

      console.log(`    Escenario: ${enterpriseFields.call_scenario}`)
      console.log(`    Sentimiento: ${enterpriseFields.client_sentiment}`)
      console.log(`    Riesgo Legal: ${enterpriseFields.legal_risk_level}`)
      console.log(`    Resultado: ${enterpriseFields.call_outcome}`)
      console.log(`    Accion: ${enterpriseFields.suggested_action}`)

      if (enterpriseFields.legal_risk_reasons.length > 0) {
        console.log(`    Razones de Riesgo: ${enterpriseFields.legal_risk_reasons.join(', ')}`)
      }

      if (!isDryRun) {
        // Update audit with enterprise fields ONLY (preserve existing data)
        const { error: updateError } = await supabase
          .from('audits')
          .update({
            call_scenario: enterpriseFields.call_scenario,
            client_sentiment: enterpriseFields.client_sentiment,
            legal_risk_level: enterpriseFields.legal_risk_level,
            legal_risk_reasons: enterpriseFields.legal_risk_reasons,
            call_outcome: enterpriseFields.call_outcome,
            suggested_action: enterpriseFields.suggested_action,
          })
          .eq('id', auditRecord.id)

        if (updateError) {
          console.error(`    ERROR actualizando: ${updateError.message}`)
          failed++
        } else {
          console.log('    Actualizada OK')
        }
      } else {
        console.log('    [DRY RUN] No se guardo')
      }

      // Rate limiting: wait 500ms between requests to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error) {
      console.error(`    ERROR procesando: ${error}`)
      failed++
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n[4/4] Resumen de la regeneracion')
  console.log('='.repeat(60))
  console.log(`  Total auditorias encontradas: ${audits.length}`)
  console.log(`  Omitidas (ya tienen Enterprise): ${auditsSkipped}`)
  console.log(`  Procesadas: ${processed}`)
  console.log(`  Exitosas: ${processed - failed}`)
  console.log(`  Fallidas: ${failed}`)
  console.log(`  Tiempo total: ${elapsed}s`)

  if (isDryRun) {
    console.log('\n  NOTA: Esto fue un DRY RUN. No se guardaron cambios.')
    console.log('  Ejecute sin --dry-run para aplicar los cambios.')
  }

  console.log('\n' + '='.repeat(60))
  console.log('Regeneracion completada.')
}

// Run the script
regenerateAuditsEnterprise()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error)
    process.exit(1)
  })
