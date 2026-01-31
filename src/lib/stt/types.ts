export interface STTWordTimestamp {
  word: string
  start: number      // seconds
  end: number        // seconds
  confidence: number // 0-1
  channel?: number   // 0=agent, 1=client
}

export interface STTUtterance {
  text: string
  start: number
  end: number
  confidence: number
  channel: number
  words: STTWordTimestamp[]
}

export interface STTTranscriptionResult {
  text: string                        // full transcript
  words: STTWordTimestamp[]            // all words with timestamps
  utterances: STTUtterance[]          // grouped by speaker/pause
  channels: number                    // number of audio channels
  duration_seconds: number            // audio duration
  language: string                    // detected language code
  provider: 'assemblyai' | 'deepgram'
  raw_response?: unknown              // original API response for debugging
}

export interface STTConfig {
  language?: string        // default: 'es' (Spanish)
  multichannel?: boolean   // default: true
  punctuate?: boolean      // default: true
  model?: string           // provider-specific model name
}

export interface STTProvider {
  transcribe(audioUrl: string, config?: STTConfig): Promise<STTTranscriptionResult>
  transcribeBuffer(buffer: Buffer, mimeType: string, config?: STTConfig): Promise<STTTranscriptionResult>
}

export interface STTCostEstimate {
  provider: 'assemblyai' | 'deepgram'
  duration_minutes: number
  cost_usd: number
  breakdown: {
    base_transcription: number
    multichannel_surcharge: number
    addons: number
  }
}
