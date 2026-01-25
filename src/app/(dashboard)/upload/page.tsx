import { Header } from '@/components/dashboard/header'
import { UploadForm } from '@/components/calls/upload-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cable } from 'lucide-react'
import { isEnterpriseMode } from '@/lib/feature-flags'

const INTEGRATION_PLATFORMS = [
  { name: 'Avaya', status: 'Próximamente' },
  { name: 'Cisco', status: 'Próximamente' },
  { name: 'Genesys', status: 'Próximamente' },
  { name: 'Salesforce', status: 'Próximamente' },
]

export default function UploadPage() {
  const enterpriseMode = isEnterpriseMode()

  return (
    <div className="flex flex-col">
      <Header
        title={enterpriseMode ? "Integraciones" : "Subir Audio"}
        description={enterpriseMode
          ? "Conecta tu infraestructura de telefonía o sube audios manualmente"
          : "Sube una grabacion de llamada para analisis automatico"
        }
      />

      <div className="p-6 max-w-3xl mx-auto w-full">
        {/* Integration Platforms Section - Enterprise Only */}
        {enterpriseMode && (
          <Card className="mb-6 border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cable className="h-5 w-5 text-blue-600" />
                Integraciones Disponibles
              </CardTitle>
              <CardDescription>
                Conecta directamente con tu infraestructura de telefonía
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 justify-center">
                {INTEGRATION_PLATFORMS.map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white/80 text-muted-foreground hover:border-blue-200 transition-colors"
                  >
                    <span className="font-medium text-foreground">{platform.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {platform.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <span className="font-medium text-blue-700">Demo Mode:</span> Mientras configuramos la integración, sube audios manualmente
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nueva Auditoria</CardTitle>
            <CardDescription>
              Sube un archivo de audio de una llamada. Nuestro sistema de IA
              transcribira y evaluara automaticamente la llamada segun los
              criterios configurados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">1. Sube el Audio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Arrastra o selecciona el archivo de audio de la llamada.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">2. Procesamiento IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gemini transcribe y analiza la conversacion automaticamente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">3. Revisa Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Obtiene scores, feedback y recomendaciones detalladas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
