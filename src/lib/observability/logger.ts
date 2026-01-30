import { createServiceClient } from '@/lib/supabase/server'

// --- Sanitization ---

const ALLOWED_CONFIG_KEYS = [
  'threshold_seconds', 'criteria_names', 'processing_mode',
  'pipeline_type', 'channel_count', 'manual_length',
  'language', 'multichannel', 'model'
]

export function safeConfigSnapshot(config: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (key in config) {
      safe[key] = config[key]
    }
  }
  return safe
}

export function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .substring(0, 500)
}

// --- Logger ---

export type ProcessingStep = 'stt' | 'silence_detection' | 'llm_evaluation'
export type StepStatus = 'started' | 'completed' | 'failed'

export interface StepResult {
  status: 'completed' | 'failed'
  durationMs?: number
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  errorMessage?: string
}

export interface LogStepParams {
  tenantId: string
  callId: string
  step: ProcessingStep
  provider: string
  modelVersion?: string
  promptHash?: string
  configSnapshot?: Record<string, unknown>
  audioDurationSeconds?: number
}

export async function logStep(params: LogStepParams): Promise<{
  complete: (result: StepResult) => Promise<void>
}> {
  const startTime = Date.now()
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('processing_logs')
    .insert({
      tenant_id: params.tenantId,
      call_id: params.callId,
      step: params.step,
      status: 'started' as StepStatus,
      provider: params.provider,
      model_version: params.modelVersion || null,
      prompt_hash: params.promptHash || null,
      config_snapshot: params.configSnapshot ? safeConfigSnapshot(params.configSnapshot) : null,
      audio_duration_seconds: params.audioDurationSeconds || null,
    })
    .select('id')
    .single()

  const logId = data?.id

  return {
    complete: async (result: StepResult) => {
      if (!logId) return

      const durationMs = result.durationMs ?? (Date.now() - startTime)

      await supabase
        .from('processing_logs')
        .update({
          status: result.status,
          duration_ms: durationMs,
          input_tokens: result.inputTokens || null,
          output_tokens: result.outputTokens || null,
          cost_usd: result.costUsd || null,
          error_message: result.errorMessage
            ? sanitizeErrorMessage(result.errorMessage)
            : null,
        })
        .eq('id', logId)
    }
  }
}
