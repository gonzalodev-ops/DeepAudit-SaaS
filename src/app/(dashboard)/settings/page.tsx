import { Header } from '@/components/dashboard/header'
import { createServiceClient } from '@/lib/supabase/server'
import { DEMO_TENANT_ID } from '@/lib/constants'
import { getAuthContext } from '@/lib/auth/session'
import { SettingsForm } from '@/components/settings/settings-form'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

async function getTenant(tenantId: string) {
  const supabase = await createServiceClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return tenant
}

export default async function SettingsPage() {
  const auth = await getAuthContext()
  const tenantId = auth?.tenantId ?? DEMO_TENANT_ID

  const tenant = await getTenant(tenantId)

  if (!tenant) {
    return (
      <div className="flex flex-col">
        <Header title="Configuracion" />
        <div className="p-6">
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium">Error al cargar configuracion</h3>
              <p className="text-muted-foreground mt-1">
                No se pudo cargar la configuracion del tenant. Por favor intenta de nuevo.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Configuracion" />
      <div className="p-6">
        <SettingsForm tenant={tenant} />
      </div>
    </div>
  )
}
