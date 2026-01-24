'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, User, Users, Zap } from 'lucide-react'
import {
  PRICING_PLANS,
  calculateMargin,
  calculateVsHuman,
  type PricingPlan,
} from '@/lib/pricing-constants'

// Formatear moneda MXN
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PricingCalculator() {
  const [seats, setSeats] = useState(100)
  const [selectedPlan, setSelectedPlan] = useState<string>('professional')

  const plan = PRICING_PLANS[selectedPlan]
  const margin = calculateMargin(plan, seats)
  const vsHuman = calculateVsHuman(plan, seats)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[var(--enterprise-primary)]" />
          Calculadora de Margen
        </CardTitle>
        <CardDescription>
          Proyeccion financiera para ventas internas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selector de asientos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Numero de asientos</label>
            <span className="text-2xl font-bold text-[var(--enterprise-primary)]">
              {seats}
            </span>
          </div>
          <Slider
            value={[seats]}
            onValueChange={(v) => setSeats(v[0])}
            min={10}
            max={500}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10</span>
            <span>500</span>
          </div>
        </div>

        {/* Selector de plan */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Plan seleccionado</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(PRICING_PLANS).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedPlan === p.id
                    ? 'border-[var(--enterprise-primary)] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-lg font-bold">{formatCurrency(p.pricePerSeatMXN)}</p>
                <p className="text-xs text-muted-foreground">/asiento/mes</p>
                {p.recommended && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Recomendado
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Resultados */}
        <div className="grid gap-4 pt-4 border-t">
          {/* Proyección mensual */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Proyeccion Mensual</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-green-700">Ingreso</p>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(margin.monthlyRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-700">Costo operativo</p>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(margin.monthlyCost)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Margen bruto</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(margin.grossMargin)}
                  </span>
                  <span className="ml-2 text-sm text-green-600">
                    ({margin.marginPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Proyección anual */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-muted-foreground">Ingreso anual</p>
              <p className="text-lg font-bold">{formatCurrency(margin.annualRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-muted-foreground">Margen anual</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(margin.annualMargin)}
              </p>
            </div>
          </div>

          {/* Comparación vs Humano */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Valor para el Cliente</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Llamadas auditadas</span>
                <span className="font-semibold">{vsHuman.deepAuditCalls.toLocaleString()}/mes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Equivalente en auditores</span>
                <span className="font-semibold">{vsHuman.humanEquivalent} QAs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Costo si fuera humano</span>
                <span className="font-semibold">{formatCurrency(vsHuman.humanCost)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="font-medium text-blue-800">Ahorro para cliente</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(vsHuman.savings)} ({vsHuman.savingsPercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Referencia: Auditor QA Humano */}
          <div className="p-4 bg-muted/30 rounded-lg border mt-4">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Referencia: Auditor QA Humano
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <span className="text-muted-foreground">Salario mensual:</span>
              <span className="font-medium">$30,000 MXN</span>
              <span className="text-muted-foreground">Capacidad:</span>
              <span className="font-medium">~800 llamadas/mes</span>
              <span className="text-muted-foreground">Costo por llamada:</span>
              <span className="font-medium">$37.50 MXN</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Promedio del mercado para auditor QA en call center
            </p>
          </div>

          {/* Multiplicador */}
          <div className="flex items-center justify-center gap-3 p-4 bg-[var(--enterprise-primary)] rounded-lg text-white">
            <Zap className="h-6 w-6" />
            <span className="text-lg">
              <strong>{vsHuman.multiplier}x</strong> mas capacidad que un auditor humano
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
