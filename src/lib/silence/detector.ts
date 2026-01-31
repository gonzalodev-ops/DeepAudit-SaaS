export interface WordTimestamp {
  word: string
  start: number  // seconds
  end: number    // seconds
  channel?: number  // 0=agent, 1=client. undefined = mono
}

export interface SilenceEvent {
  start_seconds: number
  end_seconds: number
  duration_seconds: number
  channel: number  // 0=agent, 1=client
  silence_type: 'dead_silence' | 'agent_listening' | 'hold'
}

export function detectSilences(
  words: WordTimestamp[],
  thresholdSeconds: number = 30
): SilenceEvent[] {
  if (words.length === 0) return []

  // Group words by channel (default to 0 if no channel)
  const byChannel = new Map<number, WordTimestamp[]>()
  for (const w of words) {
    const ch = w.channel ?? 0
    if (!byChannel.has(ch)) byChannel.set(ch, [])
    byChannel.get(ch)!.push(w)
  }

  // Sort each channel's words by start time
  for (const channelWords of byChannel.values()) {
    channelWords.sort((a, b) => a.start - b.start)
  }

  const events: SilenceEvent[] = []

  for (const [channel, channelWords] of byChannel) {
    for (let i = 0; i < channelWords.length - 1; i++) {
      const current = channelWords[i]
      const next = channelWords[i + 1]
      const gap = next.start - current.end

      if (gap >= thresholdSeconds) {
        let silenceType: SilenceEvent['silence_type'] = 'dead_silence'

        // If agent channel (0), check if client spoke during the gap
        if (channel === 0) {
          const clientWords = byChannel.get(1)
          if (clientWords) {
            const clientSpokeDuringGap = clientWords.some(
              cw => cw.start >= current.end && cw.end <= next.start
            )
            if (clientSpokeDuringGap) {
              silenceType = 'agent_listening'
            }
          }
        }

        events.push({
          start_seconds: current.end,
          end_seconds: next.start,
          duration_seconds: gap,
          channel,
          silence_type: silenceType,
        })
      }
    }
  }

  events.sort((a, b) => a.start_seconds - b.start_seconds)
  return events
}
