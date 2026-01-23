'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react'

interface KeyMoment {
  timestamp: string
  speaker: 'agent' | 'client'
  quote: string
  context: string
}

interface AudioPlayerProps {
  callId: string
  keyMoments?: KeyMoment[]
  duration?: number
}

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':')
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    return minutes * 60 + seconds
  }
  return 0
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer({ callId, keyMoments = [], duration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch signed URL on mount
  useEffect(() => {
    async function fetchAudioUrl() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/calls/${callId}/audio`)
        if (!response.ok) {
          throw new Error('No se pudo cargar el audio')
        }
        const data = await response.json()
        setAudioUrl(data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar audio')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAudioUrl()
  }, [callId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setAudioDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)
    const handleError = () => setError('Error al reproducir el audio')

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }

  const handleSliderChange = (value: number[]) => {
    seekTo(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 1
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Math.max(0, Math.min(audio.currentTime + seconds, audioDuration))
    seekTo(newTime)
  }

  const jumpToMoment = (timestamp: string) => {
    const seconds = parseTimestamp(timestamp)
    seekTo(seconds)
    if (!isPlaying && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Calculate progress percentage for visual markers
  const getMomentPosition = (timestamp: string): number => {
    const seconds = parseTimestamp(timestamp)
    return audioDuration > 0 ? (seconds / audioDuration) * 100 : 0
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Reproductor de Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando audio...</span>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error || !audioUrl) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Reproductor de Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
          <span>{error || 'Audio no disponible'}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Reproductor de Audio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="anonymous" />

        {/* Progress bar with markers */}
        <div className="relative">
          <Slider
            value={[currentTime]}
            max={audioDuration || 100}
            step={0.1}
            onValueChange={handleSliderChange}
            className="w-full"
          />
          {/* Key moment markers */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {keyMoments.map((moment, index) => (
              <div
                key={index}
                className="absolute w-1 h-3 -top-1 rounded-full"
                style={{
                  left: `${getMomentPosition(moment.timestamp)}%`,
                  backgroundColor: moment.speaker === 'agent' ? '#3b82f6' : '#f59e0b',
                }}
                title={`${moment.timestamp} - ${moment.context}`}
              />
            ))}
          </div>
        </div>

        {/* Time display */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={() => skip(-10)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => skip(10)}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>

        {/* Key moments list */}
        {keyMoments.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Momentos Clave</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {keyMoments.map((moment, index) => (
                <button
                  key={index}
                  onClick={() => jumpToMoment(moment.timestamp)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {moment.timestamp}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            moment.speaker === 'agent'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {moment.speaker === 'agent' ? 'Agente' : 'Cliente'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {moment.context}
                        </span>
                      </div>
                      <p className="text-sm mt-1 italic text-muted-foreground line-clamp-2">
                        &ldquo;{moment.quote}&rdquo;
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
