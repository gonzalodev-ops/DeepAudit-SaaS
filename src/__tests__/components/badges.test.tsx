/**
 * Tests for Enterprise Badges
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { LegalRiskBadge } from '@/components/enterprise/legal-risk-badge'
import { SentimentIndicator } from '@/components/enterprise/sentiment-indicator'
import { ActionBadge } from '@/components/enterprise/action-badge'
import { ScenarioBadge } from '@/components/enterprise/scenario-badge'
import { OutcomeBadge } from '@/components/enterprise/outcome-badge'

describe('LegalRiskBadge', () => {
  it('renders critical badge with CRITICO text', () => {
    render(<LegalRiskBadge level="critical" />)
    expect(screen.getByText('CRITICO')).toBeInTheDocument()
  })

  it('renders high badge with ALTO text', () => {
    render(<LegalRiskBadge level="high" />)
    expect(screen.getByText('ALTO')).toBeInTheDocument()
  })

  it('renders medium badge with MEDIO text', () => {
    render(<LegalRiskBadge level="medium" />)
    expect(screen.getByText('MEDIO')).toBeInTheDocument()
  })

  it('renders safe badge with SEGURO text', () => {
    render(<LegalRiskBadge level="safe" />)
    expect(screen.getByText('SEGURO')).toBeInTheDocument()
  })

  it('renders dash when level is null', () => {
    render(<LegalRiskBadge level={null} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('critical badge has animate-pulse class', () => {
    render(<LegalRiskBadge level="critical" />)
    const badge = screen.getByText('CRITICO').closest('span')
    expect(badge).toHaveClass('animate-pulse')
  })
})

describe('SentimentIndicator', () => {
  it('renders hostile sentiment', () => {
    render(<SentimentIndicator sentiment="hostile" />)
    expect(screen.getByText('Hostil')).toBeInTheDocument()
  })

  it('renders negative sentiment', () => {
    render(<SentimentIndicator sentiment="negative" />)
    expect(screen.getByText('Negativo')).toBeInTheDocument()
  })

  it('renders neutral sentiment', () => {
    render(<SentimentIndicator sentiment="neutral" />)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('renders positive sentiment', () => {
    render(<SentimentIndicator sentiment="positive" />)
    expect(screen.getByText('Positivo')).toBeInTheDocument()
  })

  it('renders enthusiastic sentiment', () => {
    render(<SentimentIndicator sentiment="enthusiastic" />)
    expect(screen.getByText('Entusiasta')).toBeInTheDocument()
  })

  it('renders dash when sentiment is null', () => {
    render(<SentimentIndicator sentiment={null} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})

describe('ActionBadge', () => {
  it('renders immediate_termination badge', () => {
    render(<ActionBadge action="immediate_termination" />)
    expect(screen.getByText('Despido Inmediato')).toBeInTheDocument()
  })

  it('renders urgent_coaching badge', () => {
    render(<ActionBadge action="urgent_coaching" />)
    expect(screen.getByText('Coaching Urgente')).toBeInTheDocument()
  })

  it('renders standard_coaching badge', () => {
    render(<ActionBadge action="standard_coaching" />)
    expect(screen.getByText('Coaching')).toBeInTheDocument()
  })

  it('renders model_script badge', () => {
    render(<ActionBadge action="model_script" />)
    expect(screen.getByText('Modelar Script')).toBeInTheDocument()
  })

  it('renders recognition badge', () => {
    render(<ActionBadge action="recognition" />)
    expect(screen.getByText('Reconocimiento')).toBeInTheDocument()
  })

  it('renders none badge', () => {
    render(<ActionBadge action="none" />)
    expect(screen.getByText('Sin accion')).toBeInTheDocument()
  })

  it('renders dash when action is null', () => {
    render(<ActionBadge action={null} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})

describe('ScenarioBadge', () => {
  it('renders retention scenario in Spanish', () => {
    render(<ScenarioBadge scenario="retention" />)
    expect(screen.getByText('Retencion')).toBeInTheDocument()
  })

  it('renders cancellation scenario in Spanish', () => {
    render(<ScenarioBadge scenario="cancellation" />)
    expect(screen.getByText('Cancelacion')).toBeInTheDocument()
  })

  it('renders dispute scenario in Spanish', () => {
    render(<ScenarioBadge scenario="dispute" />)
    expect(screen.getByText('Disputa')).toBeInTheDocument()
  })

  it('renders collection scenario in Spanish', () => {
    render(<ScenarioBadge scenario="collection" />)
    expect(screen.getByText('Cobranza')).toBeInTheDocument()
  })

  it('renders support scenario in Spanish', () => {
    render(<ScenarioBadge scenario="support" />)
    expect(screen.getByText('Soporte')).toBeInTheDocument()
  })

  it('renders sales scenario in Spanish', () => {
    render(<ScenarioBadge scenario="sales" />)
    expect(screen.getByText('Ventas')).toBeInTheDocument()
  })
})

describe('OutcomeBadge', () => {
  it('renders retained outcome', () => {
    render(<OutcomeBadge outcome="retained" />)
    expect(screen.getByText('Retenido')).toBeInTheDocument()
  })

  it('renders churned outcome', () => {
    render(<OutcomeBadge outcome="churned" />)
    expect(screen.getByText('Perdido')).toBeInTheDocument()
  })

  it('renders hung_up outcome', () => {
    render(<OutcomeBadge outcome="hung_up" />)
    expect(screen.getByText('Colgado')).toBeInTheDocument()
  })

  it('renders escalated outcome', () => {
    render(<OutcomeBadge outcome="escalated" />)
    expect(screen.getByText('Escalado')).toBeInTheDocument()
  })

  it('renders pending outcome', () => {
    render(<OutcomeBadge outcome="pending" />)
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })
})
