'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { FileText, Loader2, AlertTriangle } from 'lucide-react'

interface RegenerateButtonProps {
  callId: string
  currentMode: 'full' | 'compliance'
  hasFatalViolation?: boolean
  score?: number
}

export function RegenerateButton({
  callId,
  currentMode,
  hasFatalViolation = false,
  score = 100,
}: RegenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Show button if: compliance mode, or has fatal violation, or score < 50
  const shouldShow = currentMode === 'compliance' || hasFatalViolation || score < 50

  if (!shouldShow) return null

  const handleRegenerate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/calls/${callId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      })

      if (response.ok) {
        // Refresh the page to show new data
        router.refresh()
      } else {
        const data = await response.json()
        alert(`Error: ${data.error || 'Failed to regenerate'}`)
      }
    } catch (error) {
      console.error('Regenerate error:', error)
      alert('Error al regenerar la auditoria')
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonText = () => {
    if (currentMode === 'compliance') {
      return 'Generar Transcripcion Completa'
    }
    if (hasFatalViolation) {
      return 'Regenerar para Revision Legal'
    }
    return 'Regenerar Auditoria Completa'
  }

  const getDescription = () => {
    if (currentMode === 'compliance') {
      return 'Esta auditoria se proceso en modo Compliance (sin transcripcion). ¿Deseas generar la transcripcion completa para revision detallada?'
    }
    if (hasFatalViolation) {
      return 'Se detecto una violacion etica grave (ETI-01, ETI-02 o ETI-03). Se recomienda generar documentacion completa para revision legal y de recursos humanos.'
    }
    return 'El score de esta llamada es muy bajo. ¿Deseas regenerar la auditoria con transcripcion completa para revision detallada?'
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={hasFatalViolation ? 'destructive' : 'outline'}
          className="gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasFatalViolation ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {isLoading ? 'Procesando...' : getButtonText()}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasFatalViolation && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {getButtonText()}
          </AlertDialogTitle>
          <AlertDialogDescription>{getDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRegenerate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Generar Ahora'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
