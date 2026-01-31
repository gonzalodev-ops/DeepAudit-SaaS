import { detectSilences, WordTimestamp } from '../detector'

describe('detectSilences', () => {
  it('detects silence > threshold between words on same channel', () => {
    // Two words on channel 0, 35 seconds apart
    const words: WordTimestamp[] = [
      { word: 'hello', start: 0, end: 1, channel: 0 },
      { word: 'bye', start: 36, end: 37, channel: 0 },
    ]
    const result = detectSilences(words, 30)
    expect(result).toHaveLength(1)
    expect(result[0].start_seconds).toBe(1)
    expect(result[0].end_seconds).toBe(36)
    expect(result[0].duration_seconds).toBe(35)
    expect(result[0].channel).toBe(0)
  })

  it('returns empty array when no silences exceed threshold', () => {
    const words: WordTimestamp[] = [
      { word: 'hello', start: 0, end: 1, channel: 0 },
      { word: 'world', start: 2, end: 3, channel: 0 },
    ]
    expect(detectSilences(words, 30)).toEqual([])
  })

  it('handles empty word array', () => {
    expect(detectSilences([], 30)).toEqual([])
  })

  it('differentiates agent (ch0) vs client (ch1) silences', () => {
    const words: WordTimestamp[] = [
      { word: 'agent1', start: 0, end: 1, channel: 0 },
      { word: 'client1', start: 0, end: 1, channel: 1 },
      { word: 'agent2', start: 40, end: 41, channel: 0 },
      { word: 'client2', start: 5, end: 6, channel: 1 },
    ]
    const result = detectSilences(words, 30)
    // Agent has 39s gap (1 to 40), client has 4s gap (1 to 5) — only agent triggers
    const agentSilences = result.filter(s => s.channel === 0)
    const clientSilences = result.filter(s => s.channel === 1)
    expect(agentSilences).toHaveLength(1)
    expect(clientSilences).toHaveLength(0)
  })

  it('uses default 30s threshold when none specified', () => {
    const words: WordTimestamp[] = [
      { word: 'a', start: 0, end: 1, channel: 0 },
      { word: 'b', start: 32, end: 33, channel: 0 },
    ]
    const result = detectSilences(words)  // default 30s
    expect(result).toHaveLength(1)
  })

  it('uses custom threshold', () => {
    const words: WordTimestamp[] = [
      { word: 'a', start: 0, end: 1, channel: 0 },
      { word: 'b', start: 6, end: 7, channel: 0 },
    ]
    expect(detectSilences(words, 10)).toEqual([])  // 5s gap < 10s threshold
    expect(detectSilences(words, 3)).toHaveLength(1)  // 5s gap >= 3s threshold
  })

  it('calculates correct duration for each silence event', () => {
    const words: WordTimestamp[] = [
      { word: 'a', start: 10, end: 12, channel: 0 },
      { word: 'b', start: 55, end: 57, channel: 0 },
    ]
    const result = detectSilences(words, 30)
    expect(result[0].duration_seconds).toBe(43) // 55 - 12
    expect(result[0].start_seconds).toBe(12)
    expect(result[0].end_seconds).toBe(55)
  })

  it('handles overlapping speech on different channels — marks as agent_listening', () => {
    // Agent silent from 1 to 40, but client speaks at 10-11
    const words: WordTimestamp[] = [
      { word: 'agent1', start: 0, end: 1, channel: 0 },
      { word: 'client_talk', start: 10, end: 11, channel: 1 },
      { word: 'agent2', start: 40, end: 41, channel: 0 },
    ]
    const result = detectSilences(words, 30)
    expect(result).toHaveLength(1)
    expect(result[0].silence_type).toBe('agent_listening')
    expect(result[0].channel).toBe(0)
  })

  it('handles single-channel audio (no channel field)', () => {
    const words: WordTimestamp[] = [
      { word: 'a', start: 0, end: 1 },
      { word: 'b', start: 35, end: 36 },
    ]
    const result = detectSilences(words, 30)
    expect(result).toHaveLength(1)
    expect(result[0].channel).toBe(0)  // defaults to 0
    expect(result[0].silence_type).toBe('dead_silence')
  })
})
