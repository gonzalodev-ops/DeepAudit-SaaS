/**
 * Tests for Enterprise KPI Cards
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { KpiCoverageCard } from '@/components/enterprise/kpi-coverage-card'
import { KpiMoneySavedCard } from '@/components/enterprise/kpi-money-saved-card'
import { KpiCriticalAlerts } from '@/components/enterprise/kpi-critical-alerts'

describe('KpiCoverageCard', () => {
  it('renders 100% coverage text', () => {
    render(<KpiCoverageCard totalCalls={100} completedAudits={100} />)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('renders comparison with human audit', () => {
    render(<KpiCoverageCard totalCalls={100} completedAudits={100} />)
    expect(screen.getByText(/1\.5%.*Humano/i)).toBeInTheDocument()
  })

  it('renders IA label', () => {
    render(<KpiCoverageCard totalCalls={100} completedAudits={100} />)
    expect(screen.getByText(/IA/)).toBeInTheDocument()
  })
})

describe('KpiMoneySavedCard', () => {
  it('renders money saved in MXN format', () => {
    render(<KpiMoneySavedCard retainedClients={3} ltv={5000} />)
    // 3 clients * 5000 = 15000 MXN
    expect(screen.getByText(/15.*000/)).toBeInTheDocument()
  })

  it('renders number of clients saved', () => {
    render(<KpiMoneySavedCard retainedClients={3} ltv={5000} />)
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('renders disclaimer note', () => {
    render(<KpiMoneySavedCard retainedClients={3} ltv={5000} />)
    expect(screen.getByText(/Estimación/i)).toBeInTheDocument()
  })

  it('renders $0 when no clients retained', () => {
    render(<KpiMoneySavedCard retainedClients={0} ltv={5000} />)
    expect(screen.getByText(/\$0/)).toBeInTheDocument()
  })

  it('uses default LTV when not provided', () => {
    render(<KpiMoneySavedCard retainedClients={2} />)
    // 2 clients * 5000 (default) = 10000
    expect(screen.getByText(/10.*000/)).toBeInTheDocument()
  })
})

describe('KpiCriticalAlerts', () => {
  it('renders critical alert count', () => {
    render(<KpiCriticalAlerts criticalAlerts={2} highRiskAlerts={3} mediumRiskAlerts={5} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders "Requieren atención" text when alerts exist', () => {
    render(<KpiCriticalAlerts criticalAlerts={2} highRiskAlerts={3} mediumRiskAlerts={5} />)
    expect(screen.getByText(/atención/i)).toBeInTheDocument()
  })

  it('renders "Sin alertas" when no critical alerts', () => {
    render(<KpiCriticalAlerts criticalAlerts={0} highRiskAlerts={0} mediumRiskAlerts={0} />)
    expect(screen.getByText(/Sin alertas/i)).toBeInTheDocument()
  })

  it('shows high risk count', () => {
    render(<KpiCriticalAlerts criticalAlerts={1} highRiskAlerts={5} mediumRiskAlerts={2} />)
    expect(screen.getByText(/Alto.*5/i)).toBeInTheDocument()
  })

  it('has pulsing animation when critical alerts exist', () => {
    const { container } = render(<KpiCriticalAlerts criticalAlerts={2} highRiskAlerts={0} mediumRiskAlerts={0} />)
    const badge = container.querySelector('.animate-pulse')
    expect(badge).toBeInTheDocument()
  })
})
