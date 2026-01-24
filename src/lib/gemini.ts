import { GoogleGenerativeAI } from '@google/generative-ai'
import { AuditCriterion, CriterionScore } from '@/types/database'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Gemini 2.5 Flash pricing (as of 2024)
const GEMINI_PRICING = {
  inputPerMillionTokens: 0.15,  // $0.15 per 1M input tokens
  outputPerMillionTokens: 0.60, // $0.60 per 1M output tokens
}

export type ProcessingMode = 'full' | 'compliance'

interface TimestampedQuote {
  timestamp: string      // "1:23" format
  speaker: 'agent' | 'client'
  quote: string
  context: string        // Why this quote is relevant
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
}

interface AuditResult {
  transcript: string | null  // null in compliance mode
  overall_score: number
  summary: string
  strengths: string[]
  areas_for_improvement: string[]
  criteria_scores: CriterionScore[]
  recommendations: string
  duration_seconds?: number
  fatal_violation?: boolean
  violation_codes?: string[]
  // New fields
  processing_mode: ProcessingMode
  key_moments?: TimestampedQuote[]
  token_usage?: TokenUsage
  // Enterprise fields
  call_scenario?: 'retention' | 'cancellation' | 'dispute' | 'collection' | 'support' | 'sales'
  client_sentiment?: 'hostile' | 'negative' | 'neutral' | 'positive' | 'enthusiastic'
  legal_risk_level?: 'critical' | 'high' | 'medium' | 'safe'
  legal_risk_reasons?: string[]
  call_outcome?: 'retained' | 'churned' | 'hung_up' | 'escalated' | 'pending'
  suggested_action?: 'immediate_termination' | 'urgent_coaching' | 'standard_coaching' | 'model_script' | 'recognition' | 'none'
}

function calculateCost(inputTokens: number, outputTokens: number, totalTokens?: number): number {
  // Si Gemini reporta un total mayor, usamos ese para el costo (tokens de audio, sistema, etc.)
  // El costo se calcula asumiendo proporción similar input/output sobre el total real
  if (totalTokens && totalTokens > (inputTokens + outputTokens)) {
    const ratio = inputTokens / (inputTokens + outputTokens || 1)
    const adjustedInput = Math.round(totalTokens * ratio)
    const adjustedOutput = totalTokens - adjustedInput
    const inputCost = (adjustedInput / 1_000_000) * GEMINI_PRICING.inputPerMillionTokens
    const outputCost = (adjustedOutput / 1_000_000) * GEMINI_PRICING.outputPerMillionTokens
    return Number((inputCost + outputCost).toFixed(6))
  }
  const inputCost = (inputTokens / 1_000_000) * GEMINI_PRICING.inputPerMillionTokens
  const outputCost = (outputTokens / 1_000_000) * GEMINI_PRICING.outputPerMillionTokens
  return Number((inputCost + outputCost).toFixed(6))
}

function buildPrompt(
  criteria: AuditCriterion[],
  manualText: string | null,
  mode: ProcessingMode
): string {
  const criteriaDescription = criteria.length > 0
    ? criteria.map(c => `- ${c.name} (Peso: ${c.weight}%): ${c.description}`).join('\n')
    : `- Respeto y Cortesia (25%): Trato digno y profesional
- Cumplimiento de Protocolo (20%): Identificacion y procedimientos
- Resolucion del Problema (25%): Atencion efectiva
- Cierre Profesional (15%): Despedida cordial`

  const manualContext = manualText
    ? `\n\nMANUAL DE CALIDAD DE LA EMPRESA:\n${manualText}\n`
    : ''

  const transcriptInstruction = mode === 'full'
    ? '1. Transcribe la conversacion completa del audio, identificando quien habla (Agente/Cliente)'
    : '1. NO generes transcripcion completa. Solo extrae citas textuales relevantes con timestamps.'

  const outputFormat = mode === 'full'
    ? `{
  "transcript": "Agente: Hola buenos dias...\\nCliente: Hola, llamo porque...",
  "fatal_violation": false,
  "violation_codes": [],
  "overall_score": 75.5,
  "summary": "Resumen de la llamada en 2-3 oraciones describiendo que paso",
  "strengths": ["Fortaleza especifica 1", "Fortaleza especifica 2"],
  "areas_for_improvement": ["Area de mejora especifica 1", "Area de mejora especifica 2"],
  "criteria_scores": [
    {
      "criterion_id": "id_del_criterio",
      "criterion_name": "Nombre del Criterio",
      "score": 80,
      "max_score": 100,
      "feedback": "Explicacion detallada de por que se asigno este score"
    }
  ],
  "key_moments": [
    {
      "timestamp": "0:45",
      "speaker": "agent",
      "quote": "Cita textual importante",
      "context": "Por que es relevante esta cita"
    }
  ],
  "recommendations": "Recomendaciones especificas y accionables para el agente",
  "duration_seconds": 180,
  "call_scenario": "support",
  "client_sentiment": "neutral",
  "legal_risk_level": "safe",
  "legal_risk_reasons": [],
  "call_outcome": "pending",
  "suggested_action": "none"
}`
    : `{
  "transcript": null,
  "fatal_violation": false,
  "violation_codes": [],
  "overall_score": 75.5,
  "summary": "Resumen de la llamada en 2-3 oraciones describiendo que paso",
  "strengths": ["Fortaleza especifica 1", "Fortaleza especifica 2"],
  "areas_for_improvement": ["Area de mejora especifica 1", "Area de mejora especifica 2"],
  "criteria_scores": [
    {
      "criterion_id": "id_del_criterio",
      "criterion_name": "Nombre del Criterio",
      "score": 80,
      "max_score": 100,
      "feedback": "Explicacion detallada con cita textual como evidencia"
    }
  ],
  "key_moments": [
    {
      "timestamp": "0:45",
      "speaker": "agent",
      "quote": "Cita textual del momento clave",
      "context": "Saludo inicial - cumple con protocolo"
    },
    {
      "timestamp": "2:15",
      "speaker": "client",
      "quote": "Cita de momento critico",
      "context": "Cliente expresa frustracion"
    }
  ],
  "recommendations": "Recomendaciones especificas y accionables para el agente",
  "duration_seconds": 180,
  "call_scenario": "support",
  "client_sentiment": "neutral",
  "legal_risk_level": "safe",
  "legal_risk_reasons": [],
  "call_outcome": "pending",
  "suggested_action": "none"
}`

  return `Eres un auditor experto de calidad para un Contact Center de Telecomunicaciones. Tu trabajo es evaluar llamadas de servicio al cliente con EXTREMO RIGOR.

MODO DE PROCESAMIENTO: ${mode === 'full' ? 'COMPLETO (con transcripcion)' : 'COMPLIANCE (solo metadata y citas clave)'}

IMPORTANTE - CONDUCTAS DE CERO TOLERANCIA (FALLO FATAL):
- ETI-01 (Agresion Verbal): Insultos, lenguaje soez, burlas hacia el cliente, comentarios sobre su condicion economica o intelectual. Ejemplos: "muerto de hambre", "ignorante", cualquier insulto directo o indirecto.
- ETI-02 (Gaslighting Operativo): Culpar al cliente por errores del sistema, invalidar sus quejas, ridiculizar sus reclamos. Ejemplo: "El sistema no se equivoca, la gente si".
- ETI-03 (Abandono Hostil): Colgar mientras el cliente habla, negar el folio de atencion, ruidos de agresion fisica, terminar la llamada sin despedida profesional.

SI DETECTAS CUALQUIER CONDUCTA ETI-01, ETI-02 o ETI-03:
- El score general DEBE SER 0
- Marca fatal_violation: true
- Lista los codigos de violacion detectados

CLASIFICACION ENTERPRISE (campos obligatorios):

1. call_scenario - Tipo de llamada:
   - "retention": Cliente amenaza con cancelar, agente intenta retener
   - "cancellation": Cliente solicita cancelacion de servicio
   - "dispute": Cliente disputa cargos o facturas
   - "collection": Llamada de cobranza
   - "support": Soporte tecnico o resolucion de problemas
   - "sales": Venta o upgrade de servicios

2. client_sentiment - Sentimiento del cliente:
   - "hostile": Agresivo, amenazante, usa insultos
   - "negative": Frustrado, molesto, quejandose
   - "neutral": Sin emocion particular
   - "positive": Satisfecho, agradecido
   - "enthusiastic": Muy contento, elogia el servicio

3. legal_risk_level - Nivel de riesgo legal:
   - "critical": ETI-01, ETI-02 o ETI-03 detectado (violaciones eticas graves)
   - "high": Cliente menciona PROFECO, demanda, abogado SIN que el agente escale apropiadamente
   - "medium": Quejas formales, amenazas de reportar, pero manejadas correctamente
   - "safe": Sin riesgo legal identificado

4. legal_risk_reasons - Lista razones especificas si legal_risk_level no es "safe"

5. call_outcome - Resultado de la llamada:
   - "retained": Cliente retenido exitosamente (en llamadas de retencion)
   - "churned": Cliente confirmo cancelacion/baja
   - "hung_up": Llamada terminada abruptamente (cualquier parte)
   - "escalated": Llamada escalada a supervisor u otro departamento
   - "pending": Requiere seguimiento o sin resolucion definitiva

6. suggested_action - Accion sugerida para el agente:
   - "immediate_termination": ETI-01, ETI-02 o ETI-03 detectado (despido inmediato)
   - "urgent_coaching": Score < 50 (coaching urgente requerido)
   - "standard_coaching": Score 50-70 (coaching estandar)
   - "model_script": Score > 90 Y call_outcome = "retained" (usar como ejemplo)
   - "recognition": Score > 85 (reconocimiento positivo)
   - "none": Desempeno aceptable, sin accion especial
${manualContext}
CRITERIOS DE EVALUACION:
${criteriaDescription}

INSTRUCCIONES:
${transcriptInstruction}
2. PRIMERO verifica si hay violaciones ETI-01, ETI-02 o ETI-03
3. Si hay violacion etica, el score es 0 automaticamente
4. Si NO hay violacion, evalua cada criterio del 0-100
5. Calcula el score general ponderado segun los pesos
6. Se MUY CRITICO - una llamada promedio deberia tener ~70, excelente ~85+
7. IMPORTANTE: Incluye "key_moments" con timestamps (formato M:SS) para momentos criticos:
   - Saludo/identificacion
   - Momentos de tension o error
   - Violaciones de protocolo
   - Cierre de llamada

RESPONDE EXACTAMENTE en este formato JSON (sin markdown, solo JSON puro):
${outputFormat}

CRITERIOS A EVALUAR (usa exactamente estos IDs):
${criteria.map(c => `- criterion_id: "${c.id}", criterion_name: "${c.name}"`).join('\n') || '- criterion_id: "respeto", criterion_name: "Respeto y Cortesia"\n- criterion_id: "protocolo", criterion_name: "Cumplimiento de Protocolo"\n- criterion_id: "resolucion", criterion_name: "Resolucion del Problema"\n- criterion_id: "cierre", criterion_name: "Cierre Profesional"'}

Analiza el audio con rigor profesional. Responde SOLO con el JSON.`
}

export async function processAudioWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  criteria: AuditCriterion[],
  manualText?: string | null,
  mode: ProcessingMode = 'full'
): Promise<AuditResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const base64Audio = audioBuffer.toString('base64')
  const prompt = buildPrompt(criteria, manualText || null, mode)

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || 'audio/mpeg',
          data: base64Audio,
        },
      },
      { text: prompt },
    ])

    const response = await result.response

    // Extract token usage from response metadata
    const usageMetadata = response.usageMetadata
    const inputTokens = usageMetadata?.promptTokenCount || 0
    const outputTokens = usageMetadata?.candidatesTokenCount || 0
    const totalTokens = usageMetadata?.totalTokenCount || (inputTokens + outputTokens)
    const costUsd = calculateCost(inputTokens, outputTokens, totalTokens)

    const tokenUsage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
    }

    console.log(`Token usage - Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${costUsd}`)

    const text = response.text()

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(jsonMatch[0]) as any

    // If fatal violation, force score to 0
    const hasFatalViolation = parsed.fatal_violation === true
    const finalScore = hasFatalViolation ? 0 : Math.min(100, Math.max(0, parsed.overall_score || 0))

    // Determine suggested_action based on business logic
    const determineSuggestedAction = (): AuditResult['suggested_action'] => {
      // ETI violations = immediate termination
      if (hasFatalViolation) return 'immediate_termination'
      // Score < 50 = urgent coaching
      if (finalScore < 50) return 'urgent_coaching'
      // Score 50-70 = standard coaching
      if (finalScore >= 50 && finalScore <= 70) return 'standard_coaching'
      // Score > 90 + retained = model script
      if (finalScore > 90 && parsed.call_outcome === 'retained') return 'model_script'
      // Score > 85 = recognition
      if (finalScore > 85) return 'recognition'
      // Default
      return 'none'
    }

    // Determine legal_risk_level based on violations and content
    const determineLegalRiskLevel = (): AuditResult['legal_risk_level'] => {
      if (hasFatalViolation) return 'critical'
      if (parsed.legal_risk_level) return parsed.legal_risk_level
      return 'safe'
    }

    // Validate Enterprise field values
    const validCallScenarios = ['retention', 'cancellation', 'dispute', 'collection', 'support', 'sales']
    const validClientSentiments = ['hostile', 'negative', 'neutral', 'positive', 'enthusiastic']
    const validLegalRiskLevels = ['critical', 'high', 'medium', 'safe']
    const validCallOutcomes = ['retained', 'churned', 'hung_up', 'escalated', 'pending']

    const callScenario = validCallScenarios.includes(parsed.call_scenario)
      ? parsed.call_scenario
      : 'support'
    const clientSentiment = validClientSentiments.includes(parsed.client_sentiment)
      ? parsed.client_sentiment
      : 'neutral'
    const legalRiskLevel = determineLegalRiskLevel()
    const callOutcome = validCallOutcomes.includes(parsed.call_outcome)
      ? parsed.call_outcome
      : 'pending'
    const suggestedAction = determineSuggestedAction()

    // Validate and sanitize response
    return {
      transcript: mode === 'full' ? (parsed.transcript || 'Transcripcion no disponible') : null,
      overall_score: finalScore,
      summary: hasFatalViolation
        ? `FALLO FATAL: ${parsed.violation_codes?.join(', ') || 'Violacion etica detectada'}. ${parsed.summary || ''}`
        : (parsed.summary || 'Resumen no disponible'),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      areas_for_improvement: Array.isArray(parsed.areas_for_improvement)
        ? parsed.areas_for_improvement
        : [],
      criteria_scores: Array.isArray(parsed.criteria_scores)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? parsed.criteria_scores.map((cs: any) => ({
            criterion_id: cs.criterion_id || 'unknown',
            criterion_name: cs.criterion_name || 'Criterio',
            score: hasFatalViolation ? 0 : Math.min(100, Math.max(0, cs.score || 0)),
            max_score: 100,
            feedback: cs.feedback || 'Sin feedback',
          }))
        : [],
      recommendations: parsed.recommendations || 'Sin recomendaciones',
      duration_seconds: parsed.duration_seconds,
      fatal_violation: hasFatalViolation,
      violation_codes: parsed.violation_codes || [],
      // New fields
      processing_mode: mode,
      key_moments: Array.isArray(parsed.key_moments)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? parsed.key_moments.map((km: any) => ({
            timestamp: km.timestamp || '0:00',
            speaker: km.speaker === 'client' ? 'client' : 'agent',
            quote: km.quote || '',
            context: km.context || '',
          }))
        : [],
      token_usage: tokenUsage,
      // Enterprise fields
      call_scenario: callScenario as AuditResult['call_scenario'],
      client_sentiment: clientSentiment as AuditResult['client_sentiment'],
      legal_risk_level: legalRiskLevel as AuditResult['legal_risk_level'],
      legal_risk_reasons: Array.isArray(parsed.legal_risk_reasons) ? parsed.legal_risk_reasons : [],
      call_outcome: callOutcome as AuditResult['call_outcome'],
      suggested_action: suggestedAction,
    }
  } catch (error) {
    console.error('Gemini processing error:', error)
    throw new Error('Failed to process audio with Gemini')
  }
}

// Utility function to estimate cost savings between modes
export function estimateCostComparison(
  fullModeTokens: { input: number; output: number },
  complianceModeTokens: { input: number; output: number }
): {
  fullCost: number
  complianceCost: number
  savingsUsd: number
  savingsPercent: number
} {
  const fullCost = calculateCost(fullModeTokens.input, fullModeTokens.output)
  const complianceCost = calculateCost(complianceModeTokens.input, complianceModeTokens.output)
  const savingsUsd = fullCost - complianceCost
  const savingsPercent = fullCost > 0 ? (savingsUsd / fullCost) * 100 : 0

  return {
    fullCost,
    complianceCost,
    savingsUsd,
    savingsPercent: Number(savingsPercent.toFixed(1)),
  }
}
