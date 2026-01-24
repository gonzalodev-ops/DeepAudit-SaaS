'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { isEnterpriseMode } from '@/lib/feature-flags'
import { TenantSelector } from '@/components/enterprise/tenant-selector'

interface HeaderProps {
  title: string
  description?: string
  // Enterprise props
  tenants?: Array<{ id: string; name: string; industry: string | null }>
  currentTenantId?: string
  onTenantChange?: (tenantId: string) => void
}

export function Header({
  title,
  description,
  tenants = [],
  currentTenantId = '',
  onTenantChange = () => {},
}: HeaderProps) {
  const isEnterprise = isEnterpriseMode()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isEnterprise && tenants.length > 0 && (
          <TenantSelector
            tenants={tenants}
            currentTenantId={currentTenantId}
            onTenantChange={onTenantChange}
          />
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar llamadas..."
            className="w-64 pl-9"
          />
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
