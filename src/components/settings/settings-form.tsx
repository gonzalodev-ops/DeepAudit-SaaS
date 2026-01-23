'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tenant, AuditCriterion } from '@/types/database'
import {
  Building2,
  FileText,
  ListChecks,
  Cpu,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'

interface SettingsFormProps {
  tenant: Tenant
}

export function SettingsForm({ tenant }: SettingsFormProps) {
  const [name, setName] = useState(tenant.name || '')
  const [industry, setIndustry] = useState(tenant.industry || '')
  const [manualText, setManualText] = useState(tenant.manual_text || '')
  const [criteria, setCriteria] = useState<AuditCriterion[]>(tenant.audit_criteria || [])
  const [defaultMode, setDefaultMode] = useState<'full' | 'compliance'>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tenant as any).default_processing_mode || 'full'
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0)
  const isWeightValid = criteria.length === 0 || Math.abs(totalWeight - 100) <= 0.01

  // Generate unique ID for new criteria
  const generateId = () => `criterion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const addCriterion = () => {
    const remainingWeight = Math.max(0, 100 - totalWeight)
    setCriteria([
      ...criteria,
      {
        id: generateId(),
        name: '',
        weight: remainingWeight,
        description: '',
      },
    ])
  }

  const updateCriterion = (index: number, field: keyof AuditCriterion, value: string | number) => {
    const updated = [...criteria]
    updated[index] = { ...updated[index], [field]: value }
    setCriteria(updated)
  }

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'El nombre de la empresa es requerido' })
      return
    }

    if (!isWeightValid && criteria.length > 0) {
      setMessage({ type: 'error', text: `Los pesos deben sumar 100%. Actualmente suman ${totalWeight}%` })
      return
    }

    // Validate criteria have names
    const invalidCriteria = criteria.filter(c => !c.name.trim())
    if (invalidCriteria.length > 0) {
      setMessage({ type: 'error', text: 'Todos los criterios deben tener un nombre' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim() || null,
          manual_text: manualText.trim() || null,
          audit_criteria: criteria,
          default_processing_mode: defaultMode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al guardar los cambios' })
        return
      }

      setMessage({ type: 'success', text: 'Cambios guardados correctamente' })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: 'Error de conexion. Por favor intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Manual de Calidad</span>
          </TabsTrigger>
          <TabsTrigger value="criterios" className="gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Criterios de Auditoria</span>
          </TabsTrigger>
          <TabsTrigger value="procesamiento" className="gap-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">Procesamiento</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Empresa */}
        <TabsContent value="empresa" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacion de la Empresa</CardTitle>
              <CardDescription>
                Configura los datos basicos de tu empresa para personalizar las auditorias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Telecom Solutions S.A."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industria</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Ej: Telecomunicaciones, Banca, Seguros..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Manual */}
        <TabsContent value="manual" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual de Calidad</CardTitle>
              <CardDescription>
                Define las politicas y estandares de atencion que deben seguir los agentes.
                Este texto se usa como contexto para evaluar las llamadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="manual">Contenido del Manual</Label>
                <Textarea
                  id="manual"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Describe las politicas de atencion al cliente, protocolos de saludo, manejo de quejas, tiempos de respuesta, etc..."
                  className="min-h-[300px]"
                />
                <p className="text-sm text-muted-foreground">
                  {manualText.length} caracteres
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Criterios */}
        <TabsContent value="criterios" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Criterios de Auditoria</CardTitle>
                  <CardDescription>
                    Define los criterios y sus pesos para evaluar las llamadas.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {criteria.length > 0 && (
                    <Badge
                      variant={isWeightValid ? 'default' : 'destructive'}
                      className="text-sm"
                    >
                      {isWeightValid ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      Total: {totalWeight}%
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isWeightValid && criteria.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Los pesos deben sumar exactamente 100%. Actualmente suman {totalWeight}%.
                </div>
              )}

              {criteria.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay criterios definidos.</p>
                  <p className="text-sm">Se usaran los criterios predeterminados del sistema.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {criteria.map((criterion, index) => (
                    <div
                      key={criterion.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid gap-4 sm:grid-cols-[1fr_100px]">
                          <div className="space-y-2">
                            <Label>Nombre del Criterio *</Label>
                            <Input
                              value={criterion.name}
                              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                              placeholder="Ej: Saludo y Presentacion"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Peso (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={criterion.weight}
                              onChange={(e) => updateCriterion(index, 'weight', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCriterion(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Descripcion</Label>
                        <Textarea
                          value={criterion.description}
                          onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                          placeholder="Describe que se evalua en este criterio..."
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                onClick={addCriterion}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Criterio
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Procesamiento */}
        <TabsContent value="procesamiento" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Modo de Procesamiento</CardTitle>
              <CardDescription>
                Selecciona el modo predeterminado para procesar las llamadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDefaultMode('full')}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    defaultMode === 'full'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      defaultMode === 'full'
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}>
                      {defaultMode === 'full' && (
                        <div className="w-full h-full rounded-full bg-white scale-50" />
                      )}
                    </div>
                    <span className="font-semibold">Modo Completo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Genera transcripcion completa + evaluacion detallada.
                    Ideal para analisis profundo y entrenamiento.
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Mayor costo de tokens
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultMode('compliance')}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    defaultMode === 'compliance'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      defaultMode === 'compliance'
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}>
                      {defaultMode === 'compliance' && (
                        <div className="w-full h-full rounded-full bg-white scale-50" />
                      )}
                    </div>
                    <span className="font-semibold">Modo Compliance</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Solo citas clave + evaluacion. No almacena transcripcion completa.
                    Ideal para alto volumen y normativas de privacidad.
                  </p>
                  <Badge variant="outline" className="mt-2">
                    Ahorra ~40% tokens
                  </Badge>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button & Status Message */}
      <div className="flex items-center justify-between gap-4 py-4 border-t">
        <div className="flex-1">
          {message && (
            <div
              className={`flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {message.text}
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
