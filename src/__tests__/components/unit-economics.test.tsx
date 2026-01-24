/**
 * Tests para el componente UnitEconomicsCard
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { UnitEconomicsCard } from '@/components/enterprise/unit-economics-card'

// Mock fetch
global.fetch = jest.fn()

describe('UnitEconomicsCard', () => {
  const mockData = {
    avg_cost_per_audit_mxn: 0.06,
    human_audit_cost_mxn: 50,
    human_capacity_ratio: 66.7,
    operational_savings_pct: 99.88,
    total_audits: 100,
    total_cost_mxn: 6,
    human_total_cost_mxn: 5000,
    savings_mxn: 4994,
  }

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset()
  })

  test('Muestra estado de carga inicial', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    )

    render(<UnitEconomicsCard />)
    expect(screen.getByText('Unit Economics')).toBeInTheDocument()
  })

  test('Muestra las 3 métricas principales', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    })

    render(<UnitEconomicsCard />)

    await waitFor(() => {
      expect(screen.getByText('Costo por Auditoria')).toBeInTheDocument()
      expect(screen.getByText('Capacidad vs Humano')).toBeInTheDocument()
      expect(screen.getByText('Ahorro Operativo')).toBeInTheDocument()
    })
  })

  test('Muestra el valor de costo por auditoría en MXN', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    })

    render(<UnitEconomicsCard />)

    await waitFor(() => {
      expect(screen.getByText('$0.06 MXN')).toBeInTheDocument()
    })
  })

  test('Muestra la capacidad vs humano', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    })

    render(<UnitEconomicsCard />)

    await waitFor(() => {
      expect(screen.getByText('66.7x')).toBeInTheDocument()
    })
  })

  test('Muestra el porcentaje de ahorro operativo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    })

    render(<UnitEconomicsCard />)

    await waitFor(() => {
      expect(screen.getByText('99.9%')).toBeInTheDocument()
    })
  })

  test('Muestra el total de auditorías procesadas', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    })

    render(<UnitEconomicsCard />)

    await waitFor(() => {
      expect(screen.getByText(/100 auditorias procesadas/)).toBeInTheDocument()
    })
  })

  test('Llama al API endpoint correcto', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    })

    render(<UnitEconomicsCard />)

    expect(global.fetch).toHaveBeenCalledWith('/api/stats/unit-economics')
  })
})
