'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileAudio, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function UploadForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && isValidAudioFile(droppedFile)) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError('Por favor selecciona un archivo de audio valido (MP3, WAV, M4A, OGG)')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidAudioFile(selectedFile)) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Por favor selecciona un archivo de audio valido (MP3, WAV, M4A, OGG)')
    }
  }

  const isValidAudioFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm']
    return validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/calls/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al subir el archivo')
      }

      setProgress(100)

      const { callId } = await response.json()

      // Redirect to the call detail page
      setTimeout(() => {
        router.push(`/calls/${callId}`)
        router.refresh()
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          {!file ? (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">
                Arrastra un archivo de audio aqui
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="audio-upload" className="cursor-pointer">
                  Seleccionar Archivo
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos soportados: MP3, WAV, M4A, OGG (max 50MB)
              </p>
            </>
          ) : (
            <div className="w-full max-w-md">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileAudio className="h-10 w-10 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {uploading && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {progress < 100 ? 'Subiendo y procesando...' : 'Completado!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {file && !uploading && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFile(null)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Subir y Analizar
          </Button>
        </div>
      )}

      {uploading && (
        <div className="flex justify-center">
          <Button disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Procesando con IA...
          </Button>
        </div>
      )}
    </div>
  )
}
