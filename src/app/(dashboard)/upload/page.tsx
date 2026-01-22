import { Header } from '@/components/dashboard/header'
import { UploadForm } from '@/components/calls/upload-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UploadPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Subir Audio"
        description="Sube una grabacion de llamada para analisis automatico"
      />

      <div className="p-6 max-w-3xl mx-auto w-full">
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
